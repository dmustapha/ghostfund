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
  minDepositAmount: z.string().optional(), // Minimum deposit to avoid dust (wei string, default 0)
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
  runtime: Runtime<Config>,
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
  runtime: Runtime<Config>,
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
// STRATEGY LOGIC
// ═══════════════════════════════════════════════════

function decideStrategy(
  liquidityRate: bigint,
  idleBalance: bigint,
  aaveBalance: bigint,
  apyThresholdBps: number,
  minDepositAmount: bigint = 0n
): { action: number; amount: bigint; apyBps: number } {
  // Convert RAY rate to basis points: (rate * 10000) / RAY
  const apyBps = Number((liquidityRate * 10000n) / RAY)

  // Case 1: Vault has idle tokens above dust threshold AND APY is above threshold → deposit
  if (idleBalance > minDepositAmount && apyBps >= apyThresholdBps) {
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

async function onCronTrigger(runtime: Runtime<Config>, _payload: CronPayload): Promise<string> {
  const config = configSchema.parse(runtime.config)

  // Config supports multiple EVM chains. Currently Sepolia-only for hackathon demo.
  for (const evmCfg of config.evms) {
    const network = getNetwork({
      chainFamily: 'evm',
      chainSelectorName: evmCfg.chainName,
      isTestnet: true,
    })
    if (!network) {
      throw new Error('Network not found for chain selector name: ' + evmCfg.chainName)
    }
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

    // 4. Strategy decision
    const minDeposit = config.minDepositAmount ? BigInt(config.minDepositAmount) : 0n
    const { action, amount, apyBps } = decideStrategy(
      liquidityRate,
      idleBalance,
      aaveBalance,
      config.apyThresholdBps,
      minDeposit
    )

    // 5. Skip if no action
    if (action === ACTION_NONE) {
      console.log(`No action needed. APY: ${apyBps}bps, idle: ${idleBalance}, aave: ${aaveBalance}`)
      continue
    }

    // 6. Encode report
    const reportData = encodeAbiParameters(
      parseAbiParameters('uint8 action, address asset, uint256 amount, uint256 apy'),
      [action, evmCfg.assetAddress as Address, amount, BigInt(apyBps)]
    )

    // 7. Generate consensus-signed report
    const reportResponse = runtime
      .report({
        encodedPayload: hexToBase64(reportData),
        encoderName: 'evm',
        signingAlgo: 'ecdsa',
        hashingAlgo: 'keccak256',
      })
      .result()

    // 8. Write report to GhostFundVault.onReport()
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

    // Verify recommendation was stored
    const countCallData = encodeFunctionData({
      abi: [{ name: 'recommendationCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] }],
      functionName: 'recommendationCount',
    })
    const countResult = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: evmCfg.ghostFundVaultAddress as Address, data: countCallData }),
        blockNumber: LATEST_BLOCK_NUMBER,
      })
      .result()
    const newCount = decodeFunctionResult({
      abi: [{ name: 'recommendationCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] }],
      functionName: 'recommendationCount',
      data: bytesToHex(countResult.data),
    })
    console.log(`Verified: recommendationCount=${newCount}`)

    console.log(`Report written: action=${action}, amount=${amount}, apy=${apyBps}bps`)
  }
  return "ok"
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
