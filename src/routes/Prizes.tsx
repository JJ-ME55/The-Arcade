// @ts-nocheck — JSX-heavy route, Phase 5 prize counter per ed-prize-counter.jsx.
import { useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Vitrine, BrassTack, TicketGlyph, PrizeIcon } from '@/components/brand';
import {
  SHOP,
  RARITY_COLOR,
  PRIZE_FILTER_TABS,
  RARITY_CHIPS,
  VOUCHER,
  type ShopPrize,
  type ShopShelf,
} from '@/data/prizes-fixtures';

/**
 * Prizes — `/prizes` per design handoff ed-prize-counter.jsx.
 *
 *   Hero (left)   : Krona One "PRIZE COUNTER" + intro paragraph
 *   Hero (right)  : Voucher slip with TKT balance + lifetime stats
 *   Filters       : Cabinet type tabs + Rarity dot chips
 *   Shelves       : 3 vitrines stacked, each with 4 prizes on a
 *                   cream paper shelf with brass tacks at the ends;
 *                   each prize has a hanging price tag with brass
 *                   pin + ink string.
 *   Footer        : 3-column notes (One-Way Valve · Restock · Ownership)
 *
 * Data is placeholder per JJ's call. Real economy + cosmetic NFT
 * mints arrive in v3.
 */
export function Prizes() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('all');
  const [activeRarity, setActiveRarity] = useState('All');

  return (
    <main
      style={{
        padding: isMobile ? '20px 14px 40px' : '0 32px 40px',
        maxWidth: 1440,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <PrizeHero isMobile={isMobile} />
      <V3PreviewBanner isMobile={isMobile} />
      <PrizeFilters
        isMobile={isMobile}
        activeTab={activeTab}
        activeRarity={activeRarity}
        onTab={setActiveTab}
        onRarity={setActiveRarity}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 28 : 36,
          marginTop: 24,
        }}
      >
        {SHOP.map((shelf) => (
          <PrizeShelf key={shelf.cabinet} shelf={shelf} isMobile={isMobile} />
        ))}
      </div>

      <PrizeFooter isMobile={isMobile} />
    </main>
  );
}

/* ============================================================
   V3 PREVIEW BANNER — honest about what's live
   ============================================================ */
function V3PreviewBanner({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      role="status"
      style={{
        marginBottom: 24,
        padding: isMobile ? '14px 16px' : '14px 20px',
        background: 'var(--paper)',
        border: '1.5px solid var(--ink)',
        borderTop: '4px solid var(--brass)',
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: 16,
        flexDirection: isMobile ? 'column' : 'row',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.22em',
            color: 'var(--brass-deep)',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          · V3 Preview · Coming Q3 ·
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-70)', lineHeight: 1.5 }}>
          The Prize Counter is V3 economy work. Inventory below is{' '}
          <b>illustrative</b> — Tickets emission, prize stock, and claim
          flow ship together when the Ticket ledger lands. Claim buttons
          don't dispense anything yet.
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HERO
   ============================================================ */
function PrizeHero({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      style={{
        padding: '32px 0 28px',
        borderBottom: '1.5px solid var(--ink)',
        marginBottom: 24,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
        gap: 28,
        alignItems: 'end',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--brass-deep)',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          The Arcade · Floor 1 · Counter
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: isMobile ? 'clamp(2.5rem, 12vw, 4rem)' : 88,
            lineHeight: 0.86,
            textTransform: 'uppercase',
            letterSpacing: '0.01em',
            color: 'var(--ink)',
          }}
        >
          {isMobile ? 'Prize Counter' : <>Prize<br />Counter</>}
        </h1>
        <p
          style={{
            marginTop: 14,
            fontSize: 14,
            color: 'var(--ink-70)',
            maxWidth: 520,
            lineHeight: 1.5,
          }}
        >
          Tickets earned on the floor spend here. Cabinet skins, balls,
          hulls, avatars. Curated weekly.
        </p>
      </div>

      <VoucherSlip />
    </div>
  );
}

function VoucherSlip() {
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--paper)',
        border: '1.5px solid var(--ink)',
        borderBottom: '3px solid var(--ink)',
        padding: '14px 20px 16px',
        minWidth: 280,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          padding: '2px 7px',
          border: '1px dashed var(--brass)',
          color: 'var(--brass-deep)',
          fontFamily: 'var(--font-mono)',
          fontSize: 7.5,
          fontWeight: 700,
          letterSpacing: '0.2em',
          transform: 'rotate(3deg)',
        }}
      >
        VOUCHER
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          color: 'var(--ink-45)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        Your Tickets
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <TicketGlyph size={18} color="var(--brass-deep)" />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 44,
            fontWeight: 700,
            color: 'var(--brass-deep)',
            lineHeight: 1,
          }}
        >
          {VOUCHER.current}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--brass-deep)',
            letterSpacing: '0.06em',
          }}
        >
          TKT
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--win)',
          fontWeight: 700,
          letterSpacing: '0.06em',
          marginTop: 6,
        }}
      >
        {VOUCHER.weeklyDelta} earned this week ▲
      </div>
      <div style={{ height: 1, background: 'var(--hair)', margin: '12px 0' }} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--ink-70)',
          letterSpacing: '0.06em',
          gap: 12,
        }}
      >
        <span>
          Lifetime earned: <b style={{ color: 'var(--ink)' }}>{VOUCHER.lifetimeEarned}</b>
        </span>
        <span>
          Spent: <b style={{ color: 'var(--ink)' }}>{VOUCHER.lifetimeSpent}</b>
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   FILTERS
   ============================================================ */
function PrizeFilters({ isMobile, activeTab, activeRarity, onTab, onRarity }: any) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '6px 0 12px',
        borderBottom: '1.5px solid var(--ink)',
        marginBottom: 28,
        gap: 24,
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: isMobile ? 14 : 20,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {PRIZE_FILTER_TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => !t.soon && onTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: active ? 'var(--ink)' : t.soon ? 'var(--ink-45)' : 'var(--ink-70)',
                borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
                paddingBottom: 2,
                background: 'transparent',
                border: 'none',
                borderBottomColor: active ? 'var(--blue)' : 'transparent',
                borderBottomWidth: 2,
                borderBottomStyle: 'solid',
                cursor: t.soon ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
              <span
                style={{
                  color: t.soon ? 'var(--brass-deep)' : 'var(--ink-45)',
                  fontSize: 9,
                }}
              >
                {t.soon ? '· SOON' : String(t.count).padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            color: 'var(--ink-45)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          Rarity
        </span>
        {RARITY_CHIPS.map((r) => {
          const active = activeRarity === r.label;
          return (
            <button
              key={r.label}
              type="button"
              onClick={() => onRarity(r.label)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                letterSpacing: '0.08em',
                fontWeight: 700,
                color: active ? 'var(--ink)' : 'var(--ink-70)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: r.color,
                }}
              />
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   SHELF
   ============================================================ */
function PrizeShelf({ shelf, isMobile }: { shelf: ShopShelf; isMobile: boolean }) {
  return (
    <section style={{ opacity: shelf.soon ? 0.6 : 1 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingBottom: 6,
          marginBottom: 14,
          borderBottom: '1.5px solid var(--ink)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              color: 'var(--ink)',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
          >
            {shelf.cabinet}
          </h2>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              color: 'var(--ink-45)',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            · {shelf.items.length} on shelf
          </span>
        </div>
        {!shelf.soon && !isMobile && (
          <a
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--blue)',
              letterSpacing: '0.16em',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            View Cabinet →
          </a>
        )}
      </header>

      <Vitrine caseLabel={`· ${shelf.cabinet.toUpperCase()} · DISPLAY ·`} padding="24px 24px 20px">
        <div
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: 18,
            paddingTop: 4,
          }}
        >
          {/* paper shelf edge across all items */}
          <div
            style={{
              position: 'absolute',
              left: -10,
              right: -10,
              top: 132,
              height: 3,
              background: 'var(--paper)',
              borderTop: '1px solid var(--ink)',
              boxShadow:
                '0 1px 0 rgba(21,32,58,0.18), 0 4px 6px -2px rgba(21,32,58,0.10)',
              zIndex: 0,
            }}
          />
          {/* brass tacks at each end */}
          <BrassTack
            size={9}
            style={{ position: 'absolute', left: -9, top: 130, zIndex: 2 }}
          />
          <BrassTack
            size={9}
            style={{ position: 'absolute', right: -9, top: 130, zIndex: 2 }}
          />

          {shelf.items.map((p, i) => (
            <PrizeCard key={i} prize={p} />
          ))}
        </div>
      </Vitrine>
    </section>
  );
}

/* ============================================================
   PRIZE CARD (with hanging price tag)
   ============================================================ */
function PrizeCard({ prize }: { prize: ShopPrize }) {
  const rarityColor = RARITY_COLOR[prize.rarity];

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        opacity: prize.soon ? 0.55 : 1,
        display: 'flex',
        flexDirection: 'column',
        cursor: prize.soon ? 'default' : 'pointer',
      }}
    >
      {/* the prize glyph */}
      <div
        style={{
          height: 130,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {prize.glow && !prize.soon && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 110,
              height: 110,
              background: 'radial-gradient(circle, rgba(200,160,99,0.4) 0%, transparent 65%)',
              zIndex: 0,
            }}
          />
        )}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: 96,
            height: 96,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <PrizeIcon kind={prize.kind} color={rarityColor} size={64} />
        </div>
      </div>

      {/* hanging price tag */}
      <div
        style={{
          position: 'relative',
          marginTop: 22,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {/* brass pin on shelf */}
        <BrassTack
          size={8}
          style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
          }}
        />
        {/* string */}
        <div
          style={{
            position: 'absolute',
            top: -22,
            left: '50%',
            width: 1,
            height: 22,
            background: 'var(--ink)',
          }}
        />
        {/* tag */}
        <div
          style={{
            position: 'relative',
            padding: '6px 12px',
            background: 'var(--paper)',
            border: '1.5px solid var(--ink)',
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--ink)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transform: prize.soon ? 'rotate(-3deg)' : 'rotate(-2deg)',
            boxShadow: '2px 2px 0 rgba(21,32,58,0.08)',
          }}
        >
          <TicketGlyph size={11} color="var(--brass-deep)" />
          {prize.price.toLocaleString()}
          <span
            style={{
              position: 'absolute',
              top: -1,
              left: 6,
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--ink)',
            }}
          />
        </div>
      </div>

      {/* meta below */}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: 4,
            lineHeight: 1.25,
            minHeight: 36,
          }}
        >
          {prize.name}
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            color: 'var(--ink-45)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: rarityColor,
            }}
          />
          {prize.rarity}
          {!prize.soon && prize.stock !== undefined && (
            <span style={{ color: 'var(--ink-45)' }}>· {prize.stock} left</span>
          )}
          {prize.soon && <span style={{ color: 'var(--brass-deep)' }}>· Soon</span>}
        </div>
        <button
          type="button"
          disabled={prize.soon}
          style={{
            padding: '6px 14px',
            background: prize.soon ? 'transparent' : 'var(--ink)',
            color: prize.soon ? 'var(--ink-45)' : 'var(--paper)',
            border: `1.5px solid ${prize.soon ? 'var(--hair)' : 'var(--ink)'}`,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: prize.soon ? 'default' : 'pointer',
          }}
        >
          {prize.soon ? 'Soon' : 'Claim'}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   FOOTER
   ============================================================ */
function PrizeFooter({ isMobile }: { isMobile: boolean }) {
  const notes = [
    {
      title: 'Earn by playing',
      body:
        'Every cabinet pays Tickets. Skill placement pays more. Sign in to track your balance.',
    },
    {
      title: 'Curated weekly',
      body:
        'New skins land each Friday. Limited drops on themed weekends. Tournament-prize items are one-of-a-kind.',
    },
    {
      title: 'Avatar + Items (V3)',
      body:
        'Equip what you claim. Mix and match across cabinets. Trade items in the arcade marketplace.',
    },
  ];
  return (
    <footer
      style={{
        marginTop: 48,
        paddingTop: 28,
        borderTop: '1.5px solid var(--ink)',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: 24,
      }}
    >
      {notes.map((n) => (
        <div key={n.title}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.22em',
              color: 'var(--brass-deep)',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            · {n.title} ·
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--ink-70)',
              maxWidth: 380,
            }}
          >
            {n.body}
          </p>
        </div>
      ))}
    </footer>
  );
}

export default Prizes;
