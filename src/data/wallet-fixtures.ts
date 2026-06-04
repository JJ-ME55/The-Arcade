/**
 * Wallet page data.
 *
 * Beta-honest pass (2026-06-03): every fictional transaction stripped.
 * The ledger renders an empty state until Privy is back on (V2) +
 * wallet activity (V1 wagers + V3 Tickets) wires through. Hero stats
 * read "—" until a real wallet connects.
 */

export interface WalletTx {
  date: string;
  kind: 'wager-win' | 'wager-loss' | 'tickets' | 'deposit' | 'withdraw' | 'claim';
  detail: string;
  asset: 'SOL' | 'TKT';
  amount: string;
  balance: string;
}

// Empty until Privy returns (V2) + real wallet activity flows through.
// Ledger component renders an empty state with the "Sign in · V2" prompt.
export const WALLET_TXS: WalletTx[] = [];

export const KIND_LABELS: Record<WalletTx['kind'], { label: string; dot: string }> = {
  'wager-win':  { label: 'Wager · Win',  dot: 'var(--win)' },
  'wager-loss': { label: 'Wager · Loss', dot: 'var(--lose)' },
  tickets:      { label: 'Tickets',      dot: 'var(--brass-deep)' },
  deposit:      { label: 'Deposit',      dot: 'var(--blue)' },
  withdraw:     { label: 'Withdraw',     dot: 'var(--ink)' },
  claim:        { label: 'Prize Claim',  dot: 'var(--brass)' },
};

export const LEDGER_TABS = [
  { id: 'all', label: 'All',          count: WALLET_TXS.length },
  { id: 'wag', label: 'Wagers' },
  { id: 'tkt', label: 'Tickets' },
  { id: 'dep', label: 'Deposits' },
  { id: 'wd',  label: 'Withdrawals' },
  { id: 'clm', label: 'Prize Claims' },
];

export interface QuickAmount {
  sol: string;
  usd: string;
  popular?: boolean;
}

export const QUICK_AMOUNTS: QuickAmount[] = [
  { sol: '0.10', usd: '~$15' },
  { sol: '0.50', usd: '~$75' },
  { sol: '1.00', usd: '~$150', popular: true },
  { sol: '2.00', usd: '~$300' },
  { sol: '5.00', usd: '~$750' },
];

export interface LinkedWallet {
  name: string;
  detail: string;
  active?: boolean;
}

// Empty until users connect a wallet (V2 Privy return).
export const LINKED_WALLETS: LinkedWallet[] = [];

// Em-dash defaults — honest "no wallet yet" reading. Real values wire
// when a Privy session resolves (V2) and the SolShot server's wallet +
// activity endpoints land.
export const WALLET_HERO = {
  account: '—',
  sol: '—',
  solUsd: '',
  solDelta: '',
  tkt: '—',
  tktSub: '',
  tktDelta: '',
  netWagers7d: '—',
  winRate: '—',
  biggestHit: '—',
  cabinetsPlayed: '4 live',
};
