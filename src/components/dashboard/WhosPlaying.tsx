// @ts-nocheck — placeholder.
import { Section } from '@/components/brand';
import { FRIENDS_ONLINE } from '@/data/games-fixtures';

/**
 * WhosPlaying — left rail · circular avatars with online dots +
 * current-game caption. Per handoff dashboard §Left Rail.
 *
 * Placeholder list until friends-system + presence backend lands.
 * Avatars are colored discs with initials; will swap to real PFPs
 * when the friend system ships.
 */
export function WhosPlaying() {
  return (
    <Section title="Who's Playing" sub={`${FRIENDS_ONLINE.length} online`}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {FRIENDS_ONLINE.map((f, i) => (
          <li
            key={f.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              borderBottom: i < FRIENDS_ONLINE.length - 1 ? '1px dotted var(--hair)' : 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: f.color,
                  color: 'var(--paper)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  border: '1px solid var(--ink)',
                }}
              >
                {f.name[0].toUpperCase()}
              </div>
              <span
                style={{
                  position: 'absolute',
                  bottom: -1,
                  right: -1,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--win)',
                  border: '1.5px solid var(--paper)',
                }}
              />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--ink)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {f.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  color: 'var(--ink-45)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                  fontWeight: 700,
                }}
              >
                {f.playing}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export default WhosPlaying;
