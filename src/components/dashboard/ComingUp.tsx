// @ts-nocheck — placeholder.
import { Section } from '@/components/brand';
import { COMING_UP } from '@/data/games-fixtures';

/**
 * ComingUp — flat row of items with blue-bordered date pills.
 * Per handoff dashboard §Coming Up.
 */
export function ComingUp() {
  return (
    <Section title="Coming Up" sub="Roadmap">
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {COMING_UP.map((item) => (
          <li
            key={item.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: 'var(--paper)',
              border: '1px solid var(--hair)',
              opacity: 0.85,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12.5,
                color: 'var(--ink)',
                fontWeight: 600,
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                padding: '2px 7px',
                border: '1px solid var(--blue)',
                color: 'var(--blue)',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.16em',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {item.when}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export default ComingUp;
