// @ts-nocheck — placeholder.
import { Section } from '@/components/brand';
import { BROWSE_CATEGORIES } from '@/data/games-fixtures';

/**
 * Browse — left rail · cabinet types vertical hairline-separated list.
 * Per handoff dashboard §Left Rail.
 */
export function Browse() {
  return (
    <Section title="Browse" sub="Cabinet type">
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {BROWSE_CATEGORIES.map((c, i) => (
          <li
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: i < BROWSE_CATEGORIES.length - 1 ? '1px dotted var(--hair)' : 'none',
              opacity: c.soon ? 0.5 : 1,
              cursor: c.soon ? 'default' : 'pointer',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--ink)',
              }}
            >
              {c.label}
              {c.soon && (
                <span
                  style={{
                    marginLeft: 6,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8,
                    letterSpacing: '0.16em',
                    color: 'var(--ink-45)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  Soon
                </span>
              )}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink-45)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              {String(c.count).padStart(2, '0')}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export default Browse;
