import { useArcadeAuth } from '@/wallet/useAuth';
import { PLACEHOLDER_IDENTITY } from '@/data/chrome-fixtures';

/**
 * SignetPanel — 40px PFP disc with brass hairline ring + status dot.
 * Identity surface in the desktop masthead.
 *
 * Per handoff §Signet Panel:
 *   - 1.5px brass outer ring
 *   - 1px ink inner ring
 *   - Blue radial gradient inside, white Krona One initial (PFP placeholder)
 *   - 9px green status dot bottom-right with 1.5px paper border
 *   - Mono 12/700 callsign
 *   - Mono 9/700 0.18em uppercase brass-deep tier line
 *
 * Real PFP swap: replace the inner placeholder div with <img> when
 * Privy provides a profile picture.
 */
export function SignetPanel() {
  const auth = useArcadeAuth();
  // Real auth state when signed in; placeholder "guest" copy otherwise.
  // Tier line reads honestly: TG-linked + signed in → "Floor Member",
  // signed in without TG → "Link Telegram", not signed in → "Sign in · V2".
  const isAuthed = auth.authenticated;
  const callsign = isAuthed ? (auth.callsign ?? 'arcade member') : PLACEHOLDER_IDENTITY.callsign;
  const initial = isAuthed
    ? (auth.initial ?? callsign[0].toUpperCase())
    : PLACEHOLDER_IDENTITY.initial;
  const tier = isAuthed
    ? auth.hasTelegram ? 'Floor Member' : 'Link Telegram'
    : PLACEHOLDER_IDENTITY.tier;

  // Click → if signed in, future profile sheet (not built yet, no-op);
  // if not, open the Privy sign-in modal.
  const handleClick = () => {
    if (!isAuthed && auth.ready) auth.login();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={isAuthed ? `Account · ${callsign}` : 'Sign in'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px 6px 6px',
        border: '1.5px solid var(--ink)',
        background: 'var(--paper)',
        cursor: 'pointer',
      }}
    >
      {/* PFP slot */}
      <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
        {/* brass hairline ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '1.5px solid var(--brass)',
            borderRadius: '50%',
          }}
        />
        {/* inner PFP placeholder */}
        <div
          style={{
            position: 'absolute',
            inset: 2,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 30% 30%, var(--blue-bright), var(--cobalt) 70%)',
            border: '1px solid var(--ink)',
            color: 'var(--paper)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            letterSpacing: '0.02em',
          }}
        >
          {initial}
        </div>
        {/* status dot */}
        <div
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: 'var(--win)',
            border: '1.5px solid var(--paper)',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          lineHeight: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '0.02em',
          }}
        >
          {callsign}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--brass-deep)',
            letterSpacing: '0.18em',
            marginTop: 4,
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          {tier}
        </span>
      </div>

      <svg width="9" height="9" viewBox="0 0 9 9" style={{ marginLeft: 2 }} aria-hidden>
        <path
          d="M 1.5 3 L 4.5 6 L 7.5 3"
          fill="none"
          stroke="var(--ink-70)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/**
 * SignetPanelMobile — 32px disc compact variant for mobile masthead.
 * No name/tier text inline; tap → opens profile sheet (not yet built).
 */
export function SignetPanelMobile() {
  const auth = useArcadeAuth();
  const isAuthed = auth.authenticated;
  const initial = isAuthed
    ? (auth.initial ?? auth.callsign?.[0]?.toUpperCase() ?? 'A')
    : PLACEHOLDER_IDENTITY.initial;

  const handleClick = () => {
    if (!isAuthed && auth.ready) auth.login();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        position: 'relative',
        width: 32,
        height: 32,
        flexShrink: 0,
        cursor: 'pointer',
      }}
      aria-label={isAuthed ? `Account · ${auth.callsign}` : 'Sign in'}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '1.5px solid var(--brass)',
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 2,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 30% 30%, var(--blue-bright), var(--cobalt) 70%)',
          border: '1px solid var(--ink)',
          color: 'var(--paper)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: 13,
        }}
      >
        {initial}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--win)',
          border: '1.5px solid var(--paper)',
        }}
      />
    </div>
  );
}

export default SignetPanel;
