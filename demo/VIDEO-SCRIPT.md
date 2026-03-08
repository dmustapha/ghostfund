# GhostFund Demo Video Script

**Total time**: 4-5 minutes
**Setup**: QuickTime screen recording, mic on, terminal + browser ready

---

## BEFORE YOU HIT RECORD

### Terminal prep
1. Open terminal, `cd /Users/MAC/Desktop/dev/ghostfund-v2`
2. Make sure `.env` is set with valid keys
3. Run `clear` so terminal is clean
4. Set terminal font size large enough to read on video (Cmd+Plus a few times)

### Browser prep
1. Open https://ghostfund.vercel.app in Chrome
2. Make sure MetaMask is installed, on Sepolia, with some ETH
3. Open a second tab with https://sepolia.etherscan.io/address/0x4964991514f731CB3CF252108dFF889d30036fcb (the vault)
4. Keep both tabs ready but don't connect wallet yet

### Screen
- Close all other apps, notifications off (Do Not Disturb)
- Resolution: keep your normal resolution, just make sure terminal and browser text are readable

---

## SCENE 1: INTRO (0:00 - 0:40)

### What's on screen
Open the README on GitHub (https://github.com/dmustapha/ghostfund-v2) and scroll slowly through it while you talk. Pause on the architecture image.

### What to say
> "This is GhostFund, a compliant private DeFi yield vault built on three Chainlink primitives.
>
> CRE monitors Aave V3 yields and recommends deposit or withdraw actions. No funds move without the vault owner's explicit approval within a 1-hour window.
>
> Private Transactions hide the sender when distributing funds. Recipients redeem on-chain with cryptographic withdraw tickets.
>
> ACE enforces compliance: address whitelists, deposit caps, and an emergency pause, all at the smart contract level.
>
> Let me show you each of these working."

---

## SCENE 2: CRE YIELD STRATEGY (0:40 - 1:40)

### What's on screen
Switch to terminal.

### What to do + say

**Step 1**: Type and run:
```bash
bun run scripts/demo-yield-flow.ts
```

> "Here I'm running the yield demo flow. This simulates what the CRE workflow does. It reads Aave V3 reserve data, evaluates APY against our threshold, and writes a signed recommendation to the vault's onReport function."

**While it runs, narrate what you see in the output:**
> "You can see the current APY, the vault balance, and the recommendation being written on-chain. The recommendation is now stored with a 1-hour TTL."

> "Next the owner approves the recommendation by calling userApprove. Only after this explicit approval does the vault deposit funds into Aave. This is the human-in-the-loop pattern. The CRE recommends, the human approves."

**Step 2** (if time): Show the CRE simulation:
```bash
cd workflow && ~/.cre/bin/cre simulate
```

> "And here's the actual CRE workflow running in simulation. It triggers on a 5-minute cron, reads on-chain data, and outputs a signed report."

Press Ctrl+C after it runs once to move on.

```bash
cd ..
```

---

## SCENE 3: PRIVATE TRANSACTIONS (1:40 - 2:40)

### What to do + say

**Step 1**: Type and run:
```bash
bun run scripts/demo-privacy-flow.ts
```

> "Now the privacy layer. This demo uses Chainlink Private Transactions to move funds with the sender's identity hidden."

**Narrate the output:**
> "First we check balances in the PT vault. Then we do a private transfer. Notice the sender is shielded. The recipient gets a withdraw ticket, which they redeem on-chain. The blockchain sees the redemption but not who sent the funds."

> "This is how GhostFund distributes yield privately. After earning on Aave, the vault can distribute returns without exposing fund flows."

---

## SCENE 4: ACE COMPLIANCE (2:40 - 3:20)

### What to do + say

**Step 1**: Type and run:
```bash
bun run scripts/demo-compliance-flow.ts
```

> "The third primitive is ACE, the Access Control Engine. Three policies protect this vault."

**Narrate the output:**
> "AllowPolicy checks if the depositor is whitelisted. You can see this address is allowed.
>
> MaxPolicy enforces deposit caps. If someone tries to deposit above the limit, it gets rejected.
>
> PausePolicy is the emergency circuit breaker. When activated, all deposits are blocked. When deactivated, operations resume.
>
> These policies are enforced on-chain through a custom DepositExtractor contract that parses calldata for the PolicyEngine."

---

## SCENE 5: LIVE DASHBOARD (3:20 - 4:20)

### What's on screen
Switch to browser with https://ghostfund.vercel.app

### What to do + say

**Step 1**: Click "Connect Wallet" button.
> "Here's the live dashboard connected to Sepolia."

**Step 2**: Point out (mouse hover over each section as you mention it):
> "The stats banner shows live data: GhostToken balance, Aave supplied amount, current APY, and recommendation count."

**Step 3**: Scroll to CRE Yield Strategy section.
> "The CRE Strategy card shows current market conditions and what the strategy would recommend next."

**Step 4**: Scroll to Recent Recommendations.
> "Recent Recommendations shows on-chain CRE outputs. The owner can approve pending ones here with one click."

**Step 5**: Scroll to ACE Policies section.
> "And here are the three ACE policies, showing their live status on Sepolia."

**Step 6**: Scroll to Deployed Contracts.
> "All contract addresses are listed here. Every one is live on Sepolia."

---

## SCENE 6: ON-CHAIN EVIDENCE (4:20 - 4:40)

### What's on screen
Switch to the Etherscan tab.

### What to do + say
> "And on Etherscan you can see the vault's transaction history. Deposits, withdrawals, CRE reports, approvals. All verifiable on-chain."

Scroll through a few transactions quickly.

---

## SCENE 7: WRAP UP (4:40 - 5:00)

### What to say
> "GhostFund combines all three Chainlink primitives into one system. CRE automates yield monitoring with human-gated execution. Private Transactions enable confidential fund distribution. And ACE enforces compliance at every entry point.
>
> Thanks for watching."

---

## AFTER RECORDING

1. Trim any dead air at start/end in QuickTime (Edit > Trim)
2. Export as 1080p
3. Upload to YouTube (unlisted is fine)
4. Copy the YouTube URL for the submission form
