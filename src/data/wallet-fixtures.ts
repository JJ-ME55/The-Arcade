/**
 * Wallet page placeholder data per ed-wallet.jsx.
 * All numbers static for v1 per JJ.
 */

export interface WalletTx {
  date: string;
  kind: 'wager-win' | 'wager-loss' | 'tickets' | 'deposit' | 'withdraw' | 'claim';
  detail: string;
  asset: 'SOL' | 'TKT';
  amount: string;
  balance: string;
}

export const WALLET_TXS: WalletTx[] = [
  { date: '26·05 14:22', kind: 'wager-win',  detail: 'SolShot · Bullseye',           asset: 'SOL', amount: '+0.12',  balance: '4.21' },
  { date: '26·05 14:18', kind: 'wager-loss', detail: 'SolShot · Miss',               asset: 'SOL', amount: '-0.05',  balance: '4.09' },
  { date: '26·05 13:51', kind: 'tickets',    detail: 'Free Play · Basketball ×6',    asset: 'TKT', amount: '+180',   balance: '1,840' },
  { date: '26·05 12:08', kind: 'wager-win',  detail: 'Basketball · Hot Zone',        asset: 'SOL', amount: '+0.06',  balance: '4.14' },
  { date: '26·05 11:42', kind: 'deposit',    detail: 'Top Up · Phantom Wallet',      asset: 'SOL', amount: '+2.00',  balance: '4.08' },
  { date: '25·05 22:14', kind: 'claim',      detail: 'Prize Counter · Tank Bramble', asset: 'TKT', amount: '-480',   balance: '1,660' },
  { date: '25·05 21:50', kind: 'wager-loss', detail: 'Free Kicks · Miss',            asset: 'SOL', amount: '-0.02',  balance: '2.08' },
  { date: '25·05 21:42', kind: 'tickets',    detail: 'Free Play · SolShot ×3',       asset: 'TKT', amount: '+150',   balance: '2,140' },
  { date: '24·05 19:30', kind: 'wager-win',  detail: 'SolShot · Splash',             asset: 'SOL', amount: '+0.048', balance: '2.10' },
  { date: '24·05 19:24', kind: 'wager-win',  detail: 'SolShot · Bullseye',           asset: 'SOL', amount: '+0.12',  balance: '2.05' },
  { date: '24·05 19:08', kind: 'tickets',    detail: 'Free Play · Keepie Uppies ×8', asset: 'TKT', amount: '+160',   balance: '1,990' },
  { date: '23·05 15:12', kind: 'withdraw',   detail: 'Withdraw · 0xa8f3…b2c1',       asset: 'SOL', amount: '-1.50',  balance: '1.93' },
];

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

export const LINKED_WALLETS: LinkedWallet[] = [
  { name: 'Phantom',  detail: '7F3B…A91K', active: true },
  { name: 'Backpack', detail: '8z2a…cd14' },
];

export const WALLET_HERO = {
  account: '7F3B-A91K',
  sol: '4.21',
  solUsd: '≈ $612',
  solDelta: '+0.34 this week',
  tkt: '1,840',
  tktSub: '≈ 4 prizes claimable',
  tktDelta: '+220 earned this week',
  netWagers7d: '+0.42 SOL',
  winRate: '58%',
  biggestHit: '0.36 SOL',
  cabinetsPlayed: '4 / 4',
};
