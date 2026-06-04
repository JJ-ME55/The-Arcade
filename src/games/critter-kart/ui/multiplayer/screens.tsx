// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Frame } from '../Stage';
import { ClassIcon } from '../icons';
import { RACERS, type Screen } from '../data';
import { getNetClient } from '../../net/client';
import type { LobbyState, LobbySummary, Member } from '../../net/protocol';

type Go = (s: Screen) => void;

const lilita = (px: number, stroke = 0): React.CSSProperties =>
  ({ fontFamily: "'Lilita One', sans-serif", fontSize: px, textTransform: 'uppercase', WebkitTextStroke: stroke ? `${stroke}px var(--ink)` : undefined, paintOrder: 'stroke fill' } as React.CSSProperties);

function NavyBackdrop() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 50% 0%, #1b2c4c, #0c1626 70%)' }}>
      <div className="speedlines" />
    </div>
  );
}

/** Title bar shared by every multiplayer screen — pill on the left, back button on the right. */
function MpHeader({ pill, onBack }: { pill: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="pill">{pill}</div>
      <button className="ck-btn ghost sm" onClick={onBack}>‹ Back</button>
    </div>
  );
}

// =============================================================================
// MP MENU — Quick Match vs Custom Match
// =============================================================================

export function MultiplayerMenu({ go }: { go: Go }) {
  return (
    <Frame background={<NavyBackdrop />}>
      <div className="fade-enter" style={{ position: 'absolute', inset: 0, padding: '34px 56px', display: 'flex', flexDirection: 'column' }}>
        <MpHeader pill="Multiplayer" onBack={() => go('menu')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginTop: 32, flex: 1, minHeight: 0 }}>
          <ModeCard
            title="Quick Match"
            sub="Find opponents · auto-fills with bots"
            accent="var(--accent)"
            onClick={() => go('mp-matching')}
          />
          <ModeCard
            title="Custom Match"
            sub="Name a lobby · invite-only · you pick who joins"
            accent="var(--pip)"
            onClick={() => go('mp-custom-browse')}
          />
        </div>
      </div>
    </Frame>
  );
}

function ModeCard({ title, sub, accent, onClick }: { title: string; sub: string; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="panel"
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        padding: '32px 32px',
        border: 'none',
        background: `linear-gradient(120deg, ${accent}33, var(--panel) 70%)`,
        boxShadow: `0 10px 0 rgba(0,0,0,.35), inset 0 0 0 1px var(--panel-line)`,
      }}
    >
      <div className="speedlines" />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ ...lilita(46, 4), color: '#fff', lineHeight: 0.95 } as React.CSSProperties}>{title}</div>
        <div style={{ fontFamily: 'Nunito', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,.85)' }}>{sub}</div>
        <div style={{ position: 'absolute', right: 0, top: 0, ...lilita(40), color: 'rgba(255,255,255,.9)' } as React.CSSProperties}>›</div>
      </div>
    </button>
  );
}

// =============================================================================
// MATCHING — quick-match searching screen
// =============================================================================

export function Matching({ go, onMatched }: { go: Go; onMatched: (roomId: string, members: Member[]) => void }) {
  const net = getNetClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState('');

  useEffect(() => {
    let cancelled = false;
    void net.ready().then(() => {
      if (cancelled) return;
      setMe(net.username());
      net.emit('match:enqueue', {});
    });
    const offFound = net.on('match:found', ({ roomId, members: ms }) => {
      setMembers(ms);
      // Settle to the lobby ready-up step
      window.setTimeout(() => { if (!cancelled) onMatched(roomId, ms); }, 800);
    });
    return () => {
      cancelled = true;
      offFound();
      net.emit('match:cancel', {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Frame background={<NavyBackdrop />}>
      <div className="fade-enter" style={{ position: 'absolute', inset: 0, padding: '34px 56px', display: 'flex', flexDirection: 'column' }}>
        <MpHeader pill="Quick Match" onBack={() => go('mp-menu')} />
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <div className="panel pop" style={{ padding: '40px 52px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, minWidth: 460 }}>
            <div className="ck-spinner" style={{ width: 36, height: 36, borderWidth: 4 }} />
            <div style={{ ...lilita(36), color: '#fff' } as React.CSSProperties}>Searching for racers</div>
            <div className="tag" style={{ color: 'var(--muted)' }}>You: {me || '…'}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[0, 1, 2, 3].map((i) => {
                const m = members[i];
                return (
                  <div key={i} className="panel" style={{ width: 86, height: 86, display: 'grid', placeItems: 'center', borderRadius: 14, background: m ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.03)' }}>
                    {m ? (
                      <div style={{ ...lilita(15), color: '#fff', textAlign: 'center', padding: '0 6px' } as React.CSSProperties}>{m.username}</div>
                    ) : (
                      <div style={{ ...lilita(36), color: 'var(--muted)' } as React.CSSProperties}>?</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="tag" style={{ color: 'var(--muted)' }}>Found {members.length} of 4 · bots will fill the rest</div>
            <button className="ck-btn ghost" onClick={() => go('mp-menu')}>Cancel</button>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// =============================================================================
// CUSTOM BROWSE — list of open lobbies + Create New
// =============================================================================

export function CustomBrowse({ go, onJoined }: { go: Go; onJoined: (lobby: LobbyState) => void }) {
  const net = getNetClient();
  const [lobbies, setLobbies] = useState<LobbySummary[]>([]);
  const [declineMsg, setDeclineMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void net.ready().then(() => { if (!cancelled) net.emit('lobby:list', {}); });
    const offList = net.on('lobby:listing', ({ lobbies: ls }) => setLobbies(ls));
    const offJoined = net.on('lobby:joined', ({ lobby }) => onJoined(lobby));
    const offDeclined = net.on('lobby:declined', ({ reason }) => setDeclineMsg(reason || 'declined'));
    // Poll the listing every 3 s — cheap in stub, will use server pushes in production.
    const id = window.setInterval(() => net.emit('lobby:list', {}), 3000);
    return () => { cancelled = true; offList(); offJoined(); offDeclined(); window.clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Frame background={<NavyBackdrop />}>
      <div className="fade-enter" style={{ position: 'absolute', inset: 0, padding: '34px 56px', display: 'flex', flexDirection: 'column' }}>
        <MpHeader pill="Open lobbies" onBack={() => go('mp-menu')} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="ck-btn sm" onClick={() => go('mp-custom-create')}>Create new lobby ›</button>
        </div>
        {declineMsg && (
          <div className="panel" style={{ marginTop: 12, padding: '8px 14px', background: 'rgba(255, 80, 80, 0.18)', color: '#ffdcd0', fontFamily: 'Nunito', fontWeight: 700, fontSize: 13 }}>
            Join declined: {declineMsg}
          </div>
        )}
        <div style={{ marginTop: 18, display: 'grid', gap: 12, overflow: 'auto', flex: 1 }}>
          {lobbies.length === 0 && (
            <div className="panel" style={{ padding: '28px 22px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'Nunito', fontWeight: 700, fontSize: 14 }}>
              No open lobbies right now. Spin one up with “Create new lobby”.
            </div>
          )}
          {lobbies.map((l) => (
            <LobbyRow key={l.id} lobby={l} onJoin={() => net.emit('lobby:join', { lobbyId: l.id })} />
          ))}
        </div>
      </div>
    </Frame>
  );
}

function LobbyRow({ lobby, onJoin }: { lobby: LobbySummary; onJoin: () => void }) {
  const full = lobby.joinedCount >= lobby.cap;
  return (
    <div className="panel pop" style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 18 }}>
      <div>
        <div style={{ ...lilita(22), color: '#fff' } as React.CSSProperties}>{lobby.name}</div>
        <div className="tag" style={{ color: 'var(--muted)' }}>Host: {lobby.hostUsername}</div>
      </div>
      <div className="tag" style={{ color: 'var(--accent)' }}>{lobby.joinedCount}/{lobby.cap} joined</div>
      <button className="ck-btn sm" disabled={full} onClick={onJoin} style={full ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}>{full ? 'Full' : 'Request join ›'}</button>
    </div>
  );
}

// =============================================================================
// CUSTOM CREATE — name + cap
// =============================================================================

export function CustomCreate({ go, onCreated }: { go: Go; onCreated: (lobby: LobbyState) => void }) {
  const net = getNetClient();
  const [name, setName] = useState('');
  const [cap, setCap] = useState(4);

  useEffect(() => {
    const off = net.on('lobby:created', ({ lobby }) => onCreated(lobby));
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    void net.ready().then(() => net.emit('lobby:create', { name: name.trim() || `${net.username()}'s Lobby`, cap }));
  };

  return (
    <Frame background={<NavyBackdrop />}>
      <div className="fade-enter" style={{ position: 'absolute', inset: 0, padding: '34px 56px', display: 'flex', flexDirection: 'column' }}>
        <MpHeader pill="New lobby" onBack={() => go('mp-custom-browse')} />
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <div className="panel pop" style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 22, minWidth: 480 }}>
            <div>
              <div className="tag" style={{ color: 'var(--accent)' }}>Lobby name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 30))}
                placeholder="e.g. Fish vs JJ"
                style={{
                  marginTop: 8, width: '100%', padding: '12px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,.08)', border: '1px solid var(--panel-line)',
                  color: '#fff', fontFamily: "'Lilita One',sans-serif", fontSize: 22,
                  textTransform: 'uppercase', letterSpacing: 0.5, outline: 'none',
                }}
              />
            </div>
            <div>
              <div className="tag" style={{ color: 'var(--accent)' }}>Player cap</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCap(n)}
                    className="panel"
                    style={{
                      flex: 1, padding: '14px 0', border: 'none', cursor: 'pointer',
                      background: cap === n ? 'var(--accent)' : 'var(--panel)',
                      color: cap === n ? 'var(--ink)' : '#fff',
                      boxShadow: cap === n ? '0 4px 0 var(--accent-deep)' : '0 4px 0 rgba(0,0,0,.3)',
                      ...lilita(28),
                    } as React.CSSProperties}
                  >{n}</button>
                ))}
              </div>
              <div className="tag" style={{ color: 'var(--muted)', marginTop: 6 }}>Bots fill the rest of the grid.</div>
            </div>
            <button className="ck-btn" onClick={submit}>Create lobby ›</button>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// =============================================================================
// LOBBY — slots, ready-up, accept/decline (host), start (host)
// =============================================================================

export function LobbyScreen({ lobbyId, onLeave, onRaceStart }: {
  lobbyId: string;
  onLeave: () => void;
  onRaceStart: (roomId: string, startAtMs: number, members: Member[]) => void;
}) {
  const net = getNetClient();
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const me = net.username();

  useEffect(() => {
    const offState = net.on('lobby:state', ({ lobby: l }) => { if (l.id === lobbyId) setLobby(l); });
    const offJoined = net.on('lobby:joined', ({ lobby: l }) => { if (l.id === lobbyId) setLobby(l); });
    const offClosed = net.on('lobby:closed', ({ lobbyId: id }) => { if (id === lobbyId) onLeave(); });
    // Server emits race:start with roomId = race.raceId (NOT the lobby
    // id), so the prior `if (roomId === lobbyId)` filter was always
    // false and the race transition never fired. The socket room scope
    // already guarantees this event is for the current lobby — server
    // only emits race:start to lobby-room members. Trust the scope.
    const offStart = net.on('race:start', ({ roomId, startAtMs, members }) => { onRaceStart(roomId, startAtMs, members); });
    return () => { offState(); offJoined(); offClosed(); offStart(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId]);

  const myMember = useMemo(() => lobby?.members.find((m) => m.username === me), [lobby, me]);
  const isHost = !!myMember?.host;
  const everyoneReady = !!lobby && lobby.members.length > 0 && lobby.members.every((m) => m.host || m.ready);

  const toggleReady = () => net.emit('lobby:ready', { lobbyId, ready: !myMember?.ready });
  const leave = () => { net.emit('lobby:leave', { lobbyId }); onLeave(); };
  const startRace = () => net.emit('lobby:start', { lobbyId });
  const decide = (requestId: string, accept: boolean) => net.emit('lobby:decision', { requestId, accept });

  return (
    <Frame background={<NavyBackdrop />}>
      <div className="fade-enter" style={{ position: 'absolute', inset: 0, padding: '34px 56px', display: 'flex', flexDirection: 'column' }}>
        <MpHeader pill={lobby?.name || 'Lobby'} onBack={leave} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <span className="tag" style={{ color: 'var(--accent)' }}>{isHost ? 'You are the host' : `Host: ${lobby?.hostUsername || '…'}`}</span>
          <span className="tag" style={{ color: 'var(--muted)' }}>· {lobby?.members.length ?? 0}/{lobby?.cap ?? 4} joined · bots will fill the rest</span>
        </div>

        {/* Slot grid — one card per cap slot, "Waiting…" for empty slots */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 22 }}>
          {Array.from({ length: lobby?.cap ?? 4 }, (_, i) => {
            const m = lobby?.members[i];
            return <SlotCard key={i} member={m} isMe={m?.username === me} />;
          })}
        </div>

        {/* Pending join requests (host only, custom matches only) */}
        {isHost && (lobby?.pending.length ?? 0) > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="tag" style={{ color: 'var(--accent)' }}>Pending join requests</div>
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              {lobby?.pending.map((p) => (
                <div key={p.requestId} className="panel pop" style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 12 }}>
                  <div style={{ ...lilita(20), color: '#fff' } as React.CSSProperties}>{p.username}</div>
                  <button className="ck-btn sm" onClick={() => decide(p.requestId, true)}>Accept</button>
                  <button className="ck-btn ghost sm" onClick={() => decide(p.requestId, false)}>Decline</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 22 }}>
          <button className="ck-btn ghost" onClick={leave}>Leave lobby</button>
          <div style={{ display: 'flex', gap: 12 }}>
            {!isHost && (
              <button
                className="ck-btn"
                onClick={toggleReady}
                style={myMember?.ready ? { background: '#2f9e44', boxShadow: '0 7px 0 #1e7330' } : undefined}
              >{myMember?.ready ? 'Ready ✓' : 'Ready up'}</button>
            )}
            {isHost && (
              <button
                className="ck-btn"
                onClick={startRace}
                disabled={!everyoneReady}
                style={!everyoneReady ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
              >Start race ›</button>
            )}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function SlotCard({ member, isMe }: { member: Member | undefined; isMe: boolean }) {
  if (!member) {
    return (
      <div className="panel" style={{ padding: '24px 18px', textAlign: 'center', minHeight: 140, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.04)' }}>
        <div className="tag" style={{ color: 'var(--muted)' }}>Waiting…</div>
      </div>
    );
  }
  const racer = RACERS.find((r) => r.id === member.racerId) || RACERS[0];
  return (
    <div className="panel pop" style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', background: `linear-gradient(150deg, ${racer.color}22, var(--panel) 70%)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: racer.color, display: 'grid', placeItems: 'center', boxShadow: `0 3px 0 ${racer.colorDeep}` }}>
          <ClassIcon classId={racer.classId} size={18} color="#fff" />
        </div>
        <div style={{ ...lilita(20), color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>{member.username}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isMe && <span className="tag" style={{ color: 'var(--accent)', border: '1px solid var(--accent)', padding: '1px 6px', borderRadius: 5 }}>YOU</span>}
        {member.host && <span className="tag" style={{ color: 'var(--accent)' }}>HOST</span>}
        {!member.host && (
          member.ready
            ? <span className="tag" style={{ color: '#2f9e44' }}>READY ✓</span>
            : <span className="tag" style={{ color: 'var(--muted)' }}>Not ready</span>
        )}
      </div>
    </div>
  );
}

