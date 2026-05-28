import type { ReactNode } from 'react';

/**
 * Section — the typographic section primitive per handoff §Section
 * Primitive. Used throughout the product for section headers.
 *
 *   <Section title="THE FLOOR" sub="Cabinets · 4 active">
 *     {content}
 *   </Section>
 *
 * Header has a 1.5px ink-solid bottom border. Content sits below
 * with marginBottom: 12.
 */

interface Props {
  title: string;
  sub?: string;
  trailing?: ReactNode;
  children: ReactNode;
}

export function Section({ title, sub, trailing, children }: Props) {
  return (
    <section style={{ marginBottom: 28 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          paddingBottom: 8,
          marginBottom: 12,
          borderBottom: '1.5px solid var(--ink)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
            lineHeight: 1,
            margin: 0,
          }}
        >
          {title}
        </h2>
        {sub && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              fontWeight: 400,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink-45)',
            }}
          >
            · {sub}
          </span>
        )}
        {trailing && <div style={{ marginLeft: 'auto' }}>{trailing}</div>}
      </header>
      <div>{children}</div>
    </section>
  );
}

export default Section;
