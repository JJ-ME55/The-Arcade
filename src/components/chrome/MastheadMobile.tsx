import { Logo } from '@/components/brand/Logo';
import { BalanceChipMobile } from './BalanceLockup';
import { SignetPanelMobile } from './SignetPanel';
import { PLACEHOLDER_BALANCES } from '@/data/chrome-fixtures';

/**
 * MastheadMobile — compact 48px-ish header for mobile.
 * Per handoff §Masthead (Mobile).
 *
 * Layout (one row): [logo 28px] [SOL chip] [TKT chip] [signet 32px]
 *
 * Note: the parent AppShell enforces `paddingTop: 48` on the root
 * container to clear the device status bar. This header sits
 * BELOW that offset.
 */
export function MastheadMobile() {
  return (
    <header
      style={{
        padding: '10px 14px 8px',
        background: 'var(--paper)',
        borderBottom: '1.5px solid var(--ink)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}
    >
      <Logo variant="blue" height={28} />
      <div style={{ flex: 1 }} />
      <BalanceChipMobile
        label="SOL"
        value={PLACEHOLDER_BALANCES.sol.value}
        color="var(--ink)"
      />
      <BalanceChipMobile
        label="TKT"
        value={PLACEHOLDER_BALANCES.tkt.value}
        color="var(--brass-deep)"
      />
      <SignetPanelMobile />
    </header>
  );
}

export default MastheadMobile;
