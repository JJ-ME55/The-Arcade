// @ts-nocheck — JSX-heavy. Phase 6 wallet/banking-slip per ed-wallet.jsx.
import { useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Section, CornerBracket, SolanaPortal, TicketGlyph } from '@/components/brand';
import {
  WALLET_TXS,
  KIND_LABELS,
  LEDGER_TABS,
  QUICK_AMOUNTS,
  LINKED_WALLETS,
  WALLET_HERO,
  type WalletTx,
} from '@/data/wallet-fixtures';

/**
 * Wallet — `/wallet`. Per ed-wallet.jsx.
 *
 * Hero: banking slip with brass corner brackets + circular "PAID IN
 *       26·05 · TELLER 01" dashed stamp (rotated -8°), two columns
 *       (Wager Account SOL · Prize Tickets TKT) + sub-summary strip.
 * Two-col: Ledger (paper transaction history) + Rail (Quick Top Up,
 *          Linked Wallets, Safety note).
 *
 * UI only per JJ — all balances placeholder; Top Up / Withdraw /
 * Browse Prizes buttons display "Coming Soon" alert.
 */
export function Wallet() {
  const isMobile = useIsMobile();
  return (
    <main
      style={{
        padding: isMobile ? '20px 14px 40px' : '0 32px 40px',
        maxWidth: 1440,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <BankingSlipHero isMobile={isMobile} />
      <div
        style={{
          marginTop: 32,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
          columnGap: 32,
          rowGap: 28,
        }}
      >
        <Ledger isMobile={isMobile} />
        <Rail />
      </div>
    </main>
  );
}

/* ============================================================
   BANKING SLIP HERO
   ============================================================ */
function BankingSlipHero({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      style={{
        marginTop: 24,
        position: 'relative',
        background: 'var(--paper)',
        border: '1.5px solid var(--ink)',
        borderBottom: '3px solid var(--ink)',
        padding: isMobile ? '18px 18px 22px' : '24px 32px 28px',
      }}
    >
      <CornerBracket pos="tl" />
      <CornerBracket pos="tr" />
      <CornerBracket pos="bl" />
      <CornerBracket pos="br" />

      {/* circular dashed PAID IN stamp */}
      {!isMobile && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 24,
            width: 92,
            height: 92,
            borderRadius: '50%',
            border: '2px dashed var(--brass)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-8deg)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--brass-deep)',
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '0.12em',
          }}
        >
          <span style={{ fontSize: 10 }}>PAID IN</span>
          <span style={{ fontSize: 18, marginTop: 4 }}>26·05</span>
          <span style={{ fontSize: 7, marginTop: 4, letterSpacing: '0.18em' }}>· TELLER 01 ·</span>
        </div>
      )}

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.22em',
          color: 'var(--ink-45)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        The Arcade · Banking Slip · Account {WALLET_HERO.account}
      </div>
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: isMobile ? 'clamp(2rem, 9vw, 3rem)' : 56,
          lineHeight: 0.9,
          color: 'var(--ink)',
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
          marginBottom: 28,
        }}
      >
        Your Wallet
      </h1>

      {/* two columns: SOL · TKT */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? 24 : 0,
        }}
      >
        <WalletColumn
          isMobile={isMobile}
          right
          label="Wager Account"
          sub="Spendable on cabinets"
          glyph={<SolanaPortal size={20} gradId="wallet-sol" />}
          value={WALLET_HERO.sol}
          unit="SOL"
          usd={WALLET_HERO.solUsd}
          delta={WALLET_HERO.solDelta}
          color="var(--ink)"
          actions={[
            { label: 'Top Up',   primary: true },
            { label: 'Withdraw' },
            { label: 'Send' },
          ]}
        />
        <WalletColumn
          isMobile={isMobile}
          label="Prize Tickets"
          sub="Spend at the Prize Counter"
          glyph={<TicketGlyph size={20} color="var(--brass-deep)" />}
          value={WALLET_HERO.tkt}
          unit="TKT"
          usd={WALLET_HERO.tktSub}
          delta={WALLET_HERO.tktDelta}
          color="var(--brass-deep)"
          actions={[
            { label: 'Browse Prizes', primary: true },
            { label: 'Buy Tickets' },
            { label: 'Gift' },
          ]}
        />
      </div>

      {/* sub-summary strip */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 14,
          borderTop: '1px dashed var(--brass)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        <MiniStat label="Net Wagers · 7d" value={WALLET_HERO.netWagers7d} tone="var(--win)" />
        <MiniStat label="Win Rate" value={WALLET_HERO.winRate} tone="var(--ink)" />
        <MiniStat label="Biggest Hit" value={WALLET_HERO.biggestHit} tone="var(--ink)" />
        <MiniStat label="Cabinets Played" value={WALLET_HERO.cabinetsPlayed} tone="var(--ink)" />
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: any) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.2em',
          color: 'var(--ink-45)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          color: tone,
          letterSpacing: '0.02em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function WalletColumn({ isMobile, right, label, sub, glyph, value, unit, usd, delta, color, actions }: any) {
  return (
    <div
      style={{
        padding: isMobile ? 0 : right ? '0 32px 0 0' : '0 0 0 32px',
        borderRight: !isMobile && right ? '1.5px dashed var(--hair)' : 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.2em',
          color: 'var(--ink-45)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-70)', marginBottom: 12, lineHeight: 1.3 }}>{sub}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        {glyph}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: isMobile ? 42 : 56,
            color,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            color,
            letterSpacing: '0.06em',
          }}
        >
          {unit}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--ink-45)',
          marginTop: 4,
        }}
      >
        {usd} · <span style={{ color: 'var(--win)', fontWeight: 700 }}>{delta}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
        {actions.map((a: any, i: number) => (
          <button
            key={i}
            type="button"
            onClick={() => alert(`${a.label} — Coming Soon. UI only for v1.`)}
            style={{
              flex: i === 0 ? 1 : 'initial',
              padding: '9px 14px',
              background: a.primary ? 'var(--ink)' : 'transparent',
              color: a.primary ? 'var(--paper)' : 'var(--ink)',
              border: '1.5px solid var(--ink)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {a.primary ? '▸ ' : ''}
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   LEDGER
   ============================================================ */
function Ledger({ isMobile }: { isMobile: boolean }) {
  const [tab, setTab] = useState('all');
  return (
    <section>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingBottom: 6,
          marginBottom: 14,
          borderBottom: '1.5px solid var(--ink)',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              color: 'var(--ink)',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Ledger
          </h2>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.16em',
              color: 'var(--ink-45)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            · {WALLET_TXS.length} entries · last 7 days
          </span>
        </div>
        {!isMobile && (
          <a
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--brass-deep)',
              letterSpacing: '0.14em',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Export CSV →
          </a>
        )}
      </header>

      <div
        style={{
          display: 'flex',
          gap: isMobile ? 14 : 18,
          marginBottom: 14,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {LEDGER_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 5,
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: active ? 'var(--ink)' : 'var(--ink-70)',
                borderBottom: active ? '2px solid var(--brass)' : '2px solid transparent',
                paddingBottom: 2,
                background: 'transparent',
                border: 'none',
                borderBottomColor: active ? 'var(--brass)' : 'transparent',
                borderBottomStyle: 'solid',
                borderBottomWidth: 2,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
              {t.count !== undefined && (
                <span style={{ color: 'var(--ink-45)', fontSize: 9 }}>
                  {String(t.count).padStart(2, '0')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        style={{
          background: 'var(--paper)',
          border: '1.5px solid var(--ink)',
          borderTop: '4px double var(--ink)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '90px 1fr 80px'
              : '130px 110px 1fr 110px 110px',
            padding: '10px 16px',
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          <span>Date</span>
          {!isMobile && <span>Type</span>}
          <span>Detail</span>
          <span style={{ textAlign: 'right' }}>Amount</span>
          {!isMobile && <span style={{ textAlign: 'right' }}>Balance</span>}
        </div>
        {WALLET_TXS.map((tx, i) => (
          <LedgerRow key={i} tx={tx} idx={i} isMobile={isMobile} />
        ))}
      </div>
    </section>
  );
}

function LedgerRow({ tx, idx, isMobile }: { tx: WalletTx; idx: number; isMobile: boolean }) {
  const isCredit = tx.amount.startsWith('+');
  const amountColor = isCredit ? 'var(--win)' : 'var(--lose)';
  const kind = KIND_LABELS[tx.kind];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? '90px 1fr 80px'
          : '130px 110px 1fr 110px 110px',
        padding: '10px 16px',
        alignItems: 'baseline',
        borderBottom: '1px dotted var(--hair)',
        background: idx % 2 === 0 ? 'var(--paper)' : 'rgba(21,32,58,0.018)',
        gap: isMobile ? 8 : 0,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          color: 'var(--ink-70)',
          letterSpacing: '0.04em',
        }}
      >
        {tx.date}
      </span>
      {!isMobile && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 5,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--ink)',
            letterSpacing: '0.06em',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: kind.dot,
            }}
          />
          {kind.label}
        </span>
      )}
      <span
        style={{
          fontSize: 12,
          color: 'var(--ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {isMobile && (
          <span
            style={{
              display: 'inline-block',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: kind.dot,
              marginRight: 6,
              verticalAlign: 'middle',
            }}
          />
        )}
        {tx.detail}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          color: amountColor,
          textAlign: 'right',
        }}
      >
        {tx.amount}
        <span style={{ fontSize: 9, color: 'var(--ink-45)', marginLeft: 3 }}>
          {tx.asset}
        </span>
      </span>
      {!isMobile && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--ink)',
            textAlign: 'right',
          }}
        >
          {tx.balance}
          <span style={{ fontSize: 9, color: 'var(--ink-45)', marginLeft: 3 }}>
            {tx.asset}
          </span>
        </span>
      )}
    </div>
  );
}

/* ============================================================
   RAIL
   ============================================================ */
function Rail() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <QuickTopUp />
      <LinkedWalletsCard />
      <SafetyNote />
    </div>
  );
}

function QuickTopUp() {
  return (
    <div
      style={{
        background: 'var(--paper)',
        border: '1.5px solid var(--ink)',
        borderTop: '5px solid var(--brass)',
        padding: '14px 16px 16px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          color: 'var(--ink-45)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 2,
        }}
      >
        Quick Top Up
      </div>
      <h3
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          color: 'var(--ink)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          marginBottom: 12,
          lineHeight: 1,
        }}
      >
        Add SOL
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {QUICK_AMOUNTS.map((a) => (
          <button
            key={a.sol}
            type="button"
            onClick={() => alert(`Top Up ${a.sol} SOL — Coming Soon. UI only for v1.`)}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: 10,
              alignItems: 'baseline',
              padding: '9px 12px',
              background: a.popular ? 'var(--ink)' : 'transparent',
              color: a.popular ? 'var(--paper)' : 'var(--ink)',
              border: `1.5px solid ${a.popular ? 'var(--ink)' : 'var(--hair)'}`,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.04em' }}>
              {a.sol} SOL
            </span>
            <span
              style={{
                fontSize: 9,
                color: a.popular ? 'rgba(251,252,254,0.6)' : 'var(--ink-45)',
                letterSpacing: '0.08em',
              }}
            >
              {a.usd}
            </span>
            {a.popular ? (
              <span
                style={{
                  padding: '1px 5px',
                  background: 'var(--brass)',
                  color: 'var(--ink)',
                  fontSize: 8,
                  letterSpacing: '0.16em',
                  fontWeight: 700,
                }}
              >
                POPULAR
              </span>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--ink-45)' }}>▸</span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => alert('Custom Top Up — Coming Soon. UI only for v1.')}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'transparent',
          color: 'var(--ink)',
          border: '1.5px dashed var(--ink)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Custom Amount
      </button>
    </div>
  );
}

function LinkedWalletsCard() {
  return (
    <Section title="Linked Wallets" sub={`${LINKED_WALLETS.length} on file`}>
      <div>
        {LINKED_WALLETS.map((w, i) => (
          <div
            key={w.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 10,
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < LINKED_WALLETS.length - 1 ? '1px dotted var(--hair)' : 'none',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  color: 'var(--ink)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {w.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--ink-45)',
                  letterSpacing: '0.06em',
                }}
              >
                {w.detail}
              </div>
            </div>
            {w.active ? (
              <span
                style={{
                  padding: '2px 8px',
                  border: '1px solid var(--win)',
                  color: 'var(--win)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  letterSpacing: '0.16em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Active
              </span>
            ) : (
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--ink)',
                  padding: '4px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                Use
              </button>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function SafetyNote() {
  return (
    <div
      style={{
        border: '1.5px dashed var(--ink-45)',
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          color: 'var(--brass-deep)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        · Safety ·
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: 'var(--ink-70)',
          lineHeight: 1.5,
        }}
      >
        The Arcade never asks for your seed phrase. Top-ups and withdrawals go through
        your linked wallet — confirm details before signing.
      </p>
    </div>
  );
}

export default Wallet;
