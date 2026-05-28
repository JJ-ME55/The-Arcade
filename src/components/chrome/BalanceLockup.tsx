import { SolanaPortal } from '@/components/brand/SolanaPortal';
import { TicketGlyph } from '@/components/brand/TicketGlyph';
import { PLACEHOLDER_BALANCES } from '@/data/chrome-fixtures';

/**
 * BalanceLockup — single 1.5px ink-bordered box housing SOL chip +
 * TKT chip + "+ Top Up" button. Per handoff §Balance Chips Lockup.
 *
 * Desktop variant — full SOL/TKT chips with value + unit + delta lines.
 *
 * Values are placeholder per JJ's call: SOL stays placeholder until
 * we wire to the real Privy wallet balance; TKT is fully placeholder
 * until the economy ships.
 */
export function BalanceLockup() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        border: '1.5px solid var(--ink)',
        background: 'var(--paper)',
      }}
    >
      {/* SOL chip */}
      <div
        style={{
          padding: '7px 12px 7px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          borderRight: '1px solid var(--hair)',
        }}
      >
        <SolanaPortal size={13} gradId="balance-sol" />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ink)',
            }}
          >
            {PLACEHOLDER_BALANCES.sol.value}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              color: 'var(--ink-45)',
              letterSpacing: '0.16em',
              marginTop: 3,
            }}
          >
            SOL · {PLACEHOLDER_BALANCES.sol.delta}
          </span>
        </div>
      </div>

      {/* TKT chip (brass) */}
      <div
        style={{
          padding: '7px 12px 7px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <TicketGlyph size={13} color="var(--brass-deep)" />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ink)',
            }}
          >
            {PLACEHOLDER_BALANCES.tkt.value}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              color: 'var(--brass-deep)',
              letterSpacing: '0.16em',
              marginTop: 3,
              fontWeight: 700,
            }}
          >
            TKT · {PLACEHOLDER_BALANCES.tkt.delta}
          </span>
        </div>
      </div>

      {/* + Top Up button */}
      <button
        type="button"
        style={{
          padding: '0 12px',
          background: 'var(--ink)',
          color: 'var(--paper)',
          border: 'none',
          borderLeft: '1.5px solid var(--ink)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        + Top Up
      </button>
    </div>
  );
}

/**
 * BalanceChipMobile — compact value+unit chip for the mobile masthead.
 * No "Top Up" button (lives in /wallet on mobile).
 */
export function BalanceChipMobile({
  label,
  value,
  color = 'var(--ink)',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 4,
        padding: '3px 7px',
        border: '1px solid var(--hair)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          color,
          letterSpacing: '0.01em',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          fontWeight: 700,
          color: 'var(--ink-45)',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default BalanceLockup;
