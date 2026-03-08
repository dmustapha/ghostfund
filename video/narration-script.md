
# GhostFund Demo Narration Script

Total: ~3:30 | For ElevenLabs text-to-speech generation
Voice: Professional, conversational, confident. Like explaining your project to a smart friend.
Pace: ~140 words/minute. Pauses marked with [pause].

## Scene 1: Hook (0:00-0:14)

"Twenty-eight billion dollars. That's how much gets extracted from DeFi users through front-running every year. GhostFund was built to stop that."

## Scene 2: Problem (0:14-0:32)

"Here's why it happens. Every DeFi transaction is public before it settles. Your wallet address, the amount, the timing. Bots scan the mempool, spot your deposit, and sandwich it. They buy before you, sell after you, pocket the difference. You lose money on a trade you thought was safe."

## Scene 3: Solution (0:32-0:46)

"GhostFund solves this by combining three Chainlink primitives. CRE monitors yields and recommends actions. Private Transactions hide who's sending funds. ACE enforces compliance rules like whitelists and deposit caps, all at the smart contract level."

## Scene 4: CRE Yield Strategy (0:46-1:24)

"Let's see it in action. Chainlink CRE reads Aave V3 lending rates every five minutes. [pause] When rates clear the threshold and the vault has idle capital, CRE writes a signed recommendation on-chain. Here's what matters. Nothing moves automatically. The vault owner has one hour to review and approve. If they don't, the recommendation expires. The system watches the market. A human decides what to do."

## Scene 5: Private Transactions (1:24-2:02)

"When the vault distributes earnings, Private Transactions shield the sender's identity. [pause] On the left, the sender initiates a transfer. On the right, what the blockchain records. The amount and recipient are visible. The sender is hidden. The recipient gets a withdraw ticket they redeem on-chain. Funds arrive. Nobody can trace them back to the vault. That's privacy without sacrificing verifiability."

## Scene 6: ACE Compliance (2:02-2:28)

"Privacy without rules is dangerous. That's where ACE comes in. Every deposit runs through three on-chain checks. An address whitelist, a deposit cap, and an emergency pause switch. [pause] If a deposit exceeds the limit, it gets rejected. If the pause is active, everything stops. These policies live in the contracts themselves. No admin key can bypass them."

## Scene 7: Live Dashboard (2:28-3:03)

"This is the live dashboard running on Sepolia testnet right now. [pause] Token balances and lending rates update in real time. Here you can see CRE recommendations and approve them directly. [pause] The policy panel shows which compliance rules are active. Every contract address links to Etherscan so you can verify on-chain. This is not a mockup. It's a working application."

## Scene 8: Architecture (3:03-3:23)

"Under the hood. Seven smart contracts, seventy-four passing tests, three Chainlink primitives working as one system. CRE handles the intelligence. Private Transactions handle the privacy. ACE handles the rules."

## Scene 9: Close (3:23-3:37)

"GhostFund. Seven contracts. Three Chainlink primitives. One vault that earns, distributes, and enforces, all without exposing your identity. ghostfund dot vercel dot app."
