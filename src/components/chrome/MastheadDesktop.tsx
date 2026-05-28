import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { BalanceLockup } from './BalanceLockup';
import { SignetPanel } from './SignetPanel';
import { NAV_CATEGORIES } from '@/data/chrome-fixtures';

/**
 * MastheadDesktop — 80px paper bar across the top per handoff §Masthead.
 *
 * Layout: [LOGO 52px] [nav · separators] [balance lockup] [divider] [signet panel]
 *
 * Nav items use react-router NavLink so the active route gets the
 * 2px blue underline. Items marked `soon` are visually muted and
 * non-clickable.
 */
export function MastheadDesktop() {
  return (
    <header
      style={{
        position: 'relative',
        height: 80,
        flexShrink: 0,
        background: 'var(--paper)',
        borderBottom: '1.5px solid var(--ink)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 36px',
        color: 'var(--ink)',
      }}
    >
      <Logo variant="blue" height={52} />

      <nav
        style={{
          marginLeft: 36,
          display: 'flex',
          alignItems: 'baseline',
          gap: 0,
          flex: 1,
        }}
      >
        {NAV_CATEGORIES.map((c, i) => {
          const inner = (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 5,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 700,
                paddingBottom: 4,
                cursor: c.to ? 'pointer' : 'default',
              }}
            >
              {c.label}
              {c.count > 0 && (
                <span style={{ color: 'var(--ink-45)', fontSize: 9.5 }}>
                  {String(c.count).padStart(2, '0')}
                </span>
              )}
              {c.soon && (
                <span style={{ color: 'var(--blue)', fontSize: 9 }}>·</span>
              )}
            </span>
          );
          return (
            <Fragment key={c.id}>
              {i > 0 && (
                <span
                  style={{
                    color: 'var(--hair)',
                    padding: '0 14px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  ·
                </span>
              )}
              {c.to ? (
                <NavLink
                  to={c.to}
                  end
                  style={({ isActive }) => ({
                    color: isActive ? 'var(--ink)' : 'var(--ink-70)',
                    borderBottom: isActive
                      ? '2px solid var(--blue)'
                      : '2px solid transparent',
                    textDecoration: 'none',
                  })}
                >
                  {inner}
                </NavLink>
              ) : (
                <span
                  style={{
                    color: c.soon ? 'var(--ink-45)' : 'var(--ink-70)',
                    borderBottom: '2px solid transparent',
                  }}
                >
                  {inner}
                </span>
              )}
            </Fragment>
          );
        })}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <BalanceLockup />
        <div style={{ width: 1, height: 36, background: 'var(--hair)' }} />
        <SignetPanel />
      </div>
    </header>
  );
}

export default MastheadDesktop;
