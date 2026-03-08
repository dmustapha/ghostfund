// Video constants
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Scene durations in frames (at 30fps) — ~3:30 total
export const SCENE_DURATIONS = {
  hook: 14 * FPS,           // 0:00-0:14
  problem: 18 * FPS,        // 0:14-0:32
  solution: 14 * FPS,       // 0:32-0:46
  creDemo: 38 * FPS,        // 0:46-1:24
  privacyDemo: 38 * FPS,    // 1:24-2:02
  complianceDemo: 26 * FPS, // 2:02-2:28
  dashboard: 35 * FPS,      // 2:28-3:03
  architecture: 20 * FPS,   // 3:03-3:23
  close: 14 * FPS,          // 3:23-3:37
};

export const TOTAL_FRAMES = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);

// Transition overlap
export const TRANSITION_FRAMES = 15;

// Colors matching GhostFund dashboard
export const COLORS = {
  bg: '#0a0a1a',
  bgCard: 'rgba(30, 30, 60, 0.6)',
  primary: '#6366f1',    // indigo
  accent: '#22d3ee',     // cyan
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#ffffff',
  textMuted: '#94a3b8',
  border: 'rgba(99, 102, 241, 0.3)',
  glow: 'rgba(99, 102, 241, 0.4)',
};

// Terminal theme
export const TERMINAL = {
  bg: '#0d1117',
  text: '#c9d1d9',
  green: '#3fb950',
  yellow: '#d29922',
  red: '#f85149',
  blue: '#58a6ff',
  purple: '#bc8cff',
  prompt: '#8b949e',
};

// Demo script outputs (simulated from real runs)
export const YIELD_OUTPUT = [
  { text: '$ bun run scripts/demo-yield-flow.ts', color: 'prompt' as const },
  { text: '', color: 'text' as const },
  { text: 'GhostFund Yield Strategy Demo', color: 'blue' as const },
  { text: '================================', color: 'text' as const },
  { text: '', color: 'text' as const },
  { text: 'Reading Aave V3 reserve data...', color: 'text' as const },
  { text: '  Current APY: 4.23%', color: 'green' as const },
  { text: '  Vault idle balance: 10,000 GHO', color: 'text' as const },
  { text: '  Dust guard: 100 GHO', color: 'text' as const },
  { text: '', color: 'text' as const },
  { text: 'Strategy evaluation:', color: 'yellow' as const },
  { text: '  APY 4.23% > threshold 3.00%  CHECK', color: 'green' as const },
  { text: '  Idle 10,000 > dust guard 100  CHECK', color: 'green' as const },
  { text: '  Recommendation: DEPOSIT', color: 'green' as const },
  { text: '', color: 'text' as const },
  { text: 'Writing signed recommendation to vault...', color: 'text' as const },
  { text: '  tx: 0x7a3f...b2c1', color: 'purple' as const },
  { text: '  Recommendation stored (TTL: 1 hour)', color: 'green' as const },
  { text: '', color: 'text' as const },
  { text: 'Owner approving recommendation...', color: 'yellow' as const },
  { text: '  tx: 0x9e1d...4f8a', color: 'purple' as const },
  { text: '  Funds deposited to Aave V3', color: 'green' as const },
  { text: '  Amount: 9,900 GHO', color: 'green' as const },
  { text: '', color: 'text' as const },
  { text: 'Yield flow complete.', color: 'green' as const },
];

export const PRIVACY_OUTPUT = [
  { text: '$ bun run scripts/demo-privacy-flow.ts', color: 'prompt' as const },
  { text: '', color: 'text' as const },
  { text: 'GhostFund Privacy Demo', color: 'blue' as const },
  { text: '================================', color: 'text' as const },
  { text: '', color: 'text' as const },
  { text: 'Checking PT Vault balances...', color: 'text' as const },
  { text: '  GhostToken balance: 5,000 GHO', color: 'text' as const },
  { text: '', color: 'text' as const },
  { text: 'Initiating private transfer...', color: 'yellow' as const },
  { text: '  Amount: 1,000 GHO', color: 'text' as const },
  { text: '  Sender: SHIELDED', color: 'green' as const },
  { text: '  Recipient: 0x742d...35Cc', color: 'text' as const },
  { text: '', color: 'text' as const },
  { text: 'Private transfer complete', color: 'green' as const },
  { text: '  Withdraw ticket generated', color: 'green' as const },
  { text: '  ticket: 0xab12...ef34', color: 'purple' as const },
  { text: '', color: 'text' as const },
  { text: 'Recipient redeeming on-chain...', color: 'yellow' as const },
  { text: '  tx: 0x3c8e...91ba', color: 'purple' as const },
  { text: '  Redeemed: 1,000 GHO', color: 'green' as const },
  { text: '', color: 'text' as const },
  { text: 'On-chain: redemption visible', color: 'text' as const },
  { text: 'On-chain: sender identity HIDDEN', color: 'green' as const },
];

export const COMPLIANCE_OUTPUT = [
  { text: '$ bun run scripts/demo-compliance-flow.ts', color: 'prompt' as const },
  { text: '', color: 'text' as const },
  { text: 'GhostFund Compliance Demo', color: 'blue' as const },
  { text: '================================', color: 'text' as const },
  { text: '', color: 'text' as const },
  { text: 'Test 1: AllowPolicy (address whitelist)', color: 'yellow' as const },
  { text: '  Address: 0x742d...35Cc', color: 'text' as const },
  { text: '  Status: WHITELISTED', color: 'green' as const },
  { text: '  Result: PASS', color: 'green' as const },
  { text: '', color: 'text' as const },
  { text: 'Test 2: MaxPolicy (deposit cap)', color: 'yellow' as const },
  { text: '  Deposit: 500 GHO (limit: 10,000)', color: 'text' as const },
  { text: '  Result: PASS', color: 'green' as const },
  { text: '  Deposit: 50,000 GHO (limit: 10,000)', color: 'text' as const },
  { text: '  Result: REJECTED', color: 'red' as const },
  { text: '', color: 'text' as const },
  { text: 'Test 3: PausePolicy (circuit breaker)', color: 'yellow' as const },
  { text: '  Activating pause...', color: 'text' as const },
  { text: '  Deposit attempt: BLOCKED', color: 'red' as const },
  { text: '  Deactivating pause...', color: 'text' as const },
  { text: '  Deposit attempt: PASS', color: 'green' as const },
  { text: '', color: 'text' as const },
  { text: 'All compliance checks complete.', color: 'green' as const },
];
