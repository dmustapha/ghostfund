import {
  bytesToHex,
  type CronPayload,
  cre,
  encodeCallMsg,
  EVMClient,
  getNetwork,
  hexToBase64,
  LATEST_BLOCK_NUMBER,
  Runner,
  type Runtime,
  TxStatus,
} from '@chainlink/cre-sdk'
import {
  type Address,
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  formatUnits,
  type Hex,
  parseAbiParameters,
  zeroAddress,
} from 'viem'
import { z } from 'zod'

// ═══════════════════════════════════════════════════
// CONFIG SCHEMA
// ═══════════════════════════════════════════════════

const configSchema = z.object({
  schedule: z.string(),
  apyThresholdBps: z.number(), // Minimum APY in basis points to recommend deposit
  priceApiUrl: z.string(),
  evms: z.array(
    z.object({
      assetAddress: z.string(),
      poolAddress: z.string(),
      ghostFundVaultAddress: z.string(),
      chainName: z.string(),
      gasLimit: z.string(),
    })
  ),
})

type Config = z.infer<typeof configSchema>

// ═══════════════════════════════════════════════════
// ABIs (inline for CRE bundle)
// ═══════════════════════════════════════════════════

const IPoolABI = [
  {
    name: 'getReserveData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'configuration', type: 'tuple', components: [{ name: 'data', type: 'uint256' }] },
          { name: 'liquidityIndex', type: 'uint128' },
          { name: 'currentLiquidityRate', type: 'uint128' },
          { name: 'variableBorrowIndex', type: 'uint128' },
          { name: 'currentVariableBorrowRate', type: 'uint128' },
          { name: 'currentStableBorrowRate', type: 'uint128' },
          { name: 'lastUpdateTimestamp', type: 'uint40' },
          { name: 'id', type: 'uint16' },
          { name: 'aTokenAddress', type: 'address' },
          { name: 'stableDebtTokenAddress', type: 'address' },
          { name: 'variableDebtTokenAddress', type: 'address' },
          { name: 'interestRateStrategyAddress', type: 'address' },
          { name: 'accruedToTreasury', type: 'uint128' },
          { name: 'unbacked', type: 'uint128' },
          { name: 'isolationModeTotalDebt', type: 'uint128' },
        ],
      },
    ],
  },
] as const

const ERC20ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

const RAY = 10n ** 27n
const ACTION_NONE = 0
const ACTION_DEPOSIT = 1
const ACTION_WITHDRAW = 2

// ═══════════════════════════════════════════════════
// HELPER: Read Aave APY
// ═══════════════════════════════════════════════════

function readAaveAPY(
  evmClient: EVMClient,
  runtime: Runtime,
  poolAddress: Address,
  assetAddress: Address
): { liquidityRate: bigint; aTokenAddress: Address } {
  const callData = encodeFunctionData({
    abi: IPoolABI,
    functionName: 'getReserveData',
    args: [assetAddress],
  })

  const callResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: poolAddress,
        data: callData,
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result()

  const decoded = decodeFunctionResult({
    abi: IPoolABI,
    functionName: 'getReserveData',
    data: bytesToHex(callResult.data),
  })

  return {
    liquidityRate: BigInt(decoded.currentLiquidityRate),
    aTokenAddress: decoded.aTokenAddress as Address,
  }
}

// ═══════════════════════════════════════════════════
// HELPER: Read ERC20 Balance
// ═══════════════════════════════════════════════════

function readBalance(
  evmClient: EVMClient,
  runtime: Runtime,
  tokenAddress: Address,
  account: Address
): bigint {
  const callData = encodeFunctionData({
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [account],
  })

  const callResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: tokenAddress,
        data: callData,
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result()

  const decoded = decodeFunctionResult({
    abi: ERC20ABI,
    functionName: 'balanceOf',
    data: bytesToHex(callResult.data),
  })

  return BigInt(decoded)
}

// ═══════════════════════════════════════════════════
// HELPER: Fetch Price (CoinGecko)
// ═══════════════════════════════════════════════════

function fetchPrice(runtime: Runtime, priceApiUrl: string): number {
  const httpCapability = new cre.capabilities.HTTPClient()

  // ⚠️ UNVERIFIED: ConsensusAggregation pattern may differ.
  // If this fails, hardcode price for demo (USDC = 1.0).
  try {
    const result = httpCapability.sendRequest(runtime, {
      method: 'GET',
      url: priceApiUrl,
    }).result()

    const body = JSON.parse(Buffer.from(result.body).toString('utf-8'))
    return body['usd-coin']?.usd ?? 1.0
  } catch {
    // Fallback: assume USDC = $1.00 for demo
    return 1.0
  }
}

// ═══════════════════════════════════════════════════
// STRATEGY LOGIC
// ═══════════════════════════════════════════════════

function decideStrategy(
  liquidityRate: bigint,
  idleBalance: bigint,
  aaveBalance: bigint,
  apyThresholdBps: number
): { action: number; amount: bigint; apyBps: number } {
  // Convert RAY rate to basis points: (rate * 10000) / RAY
  const apyBps = Number((liquidityRate * 10000n) / RAY)

  // Case 1: Vault has idle tokens AND APY is above threshold → deposit
  if (idleBalance > 0n && apyBps >= apyThresholdBps) {
    return { action: ACTION_DEPOSIT, amount: idleBalance, apyBps }
  }

  // Case 2: Vault has Aave position AND APY dropped below half threshold → withdraw
  if (aaveBalance > 0n && apyBps < apyThresholdBps / 2) {
    return { action: ACTION_WITHDRAW, amount: aaveBalance, apyBps }
  }

  // Case 3: No action needed
  return { action: ACTION_NONE, amount: 0n, apyBps }
}

// ═══════════════════════════════════════════════════
// CRON HANDLER
// ═══════════════════════════════════════════════════

function onCronTrigger(runtime: Runtime, _payload: CronPayload) {
  const config = configSchema.parse(runtime.config)

  for (const evmCfg of config.evms) {
    const network = getNetwork({
      chainFamily: 'evm',
      chainSelectorName: evmCfg.chainName,
      isTestnet: true,
    })
    const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

    // 1. Read Aave APY
    const { liquidityRate, aTokenAddress } = readAaveAPY(
      evmClient,
      runtime,
      evmCfg.poolAddress as Address,
      evmCfg.assetAddress as Address
    )

    // 2. Read vault's idle token balance
    const idleBalance = readBalance(
      evmClient,
      runtime,
      evmCfg.assetAddress as Address,
      evmCfg.ghostFundVaultAddress as Address
    )

    // 3. Read vault's Aave position (aToken balance)
    const aaveBalance = aTokenAddress !== zeroAddress
      ? readBalance(evmClient, runtime, aTokenAddress, evmCfg.ghostFundVaultAddress as Address)
      : 0n

    // 4. Fetch price (optional, for display)
    const _price = fetchPrice(runtime, config.priceApiUrl)

    // 5. Strategy decision
    const { action, amount, apyBps } = decideStrategy(
      liquidityRate,
      idleBalance,
      aaveBalance,
      config.apyThresholdBps
    )

    // 6. Skip if no action
    if (action === ACTION_NONE) {
      console.log(`No action needed. APY: ${apyBps}bps, idle: ${idleBalance}, aave: ${aaveBalance}`)
      continue
    }

    // 7. Encode report
    const reportData = encodeAbiParameters(
      parseAbiParameters('uint8 action, address asset, uint256 amount, uint256 apy'),
      [action, evmCfg.assetAddress as Address, amount, BigInt(apyBps)]
    )

    // 8. Generate consensus-signed report
    const reportResponse = runtime
      .report({
        encodedPayload: hexToBase64(reportData),
        encoderName: 'evm',
        signingAlgo: 'ecdsa',
        hashingAlgo: 'keccak256',
      })
      .result()

    // 9. Write report to GhostFundVault.onReport()
    const resp = evmClient
      .writeReport(runtime, {
        receiver: evmCfg.ghostFundVaultAddress as Address,
        report: reportResponse,
        gasConfig: { gasLimit: evmCfg.gasLimit },
      })
      .result()

    if (resp.txStatus !== TxStatus.SUCCESS) {
      throw new Error(`writeReport failed: ${resp.errorMessage}`)
    }

    console.log(`Report written: action=${action}, amount=${amount}, apy=${apyBps}bps`)
  }
}

// ═══════════════════════════════════════════════════
// WORKFLOW INIT
// ═══════════════════════════════════════════════════

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability()
  return [
    cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}

main()
