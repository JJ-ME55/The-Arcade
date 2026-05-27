# Voice-over clips (military announcer)

Drop your military VO files here to replace the built-in robotic speech-synth
fallback. The game loads them by name; any missing clip falls back to synth.

Expected files (`.mp3`, `.wav`, or `.ogg`):

| File           | Line                          |
|----------------|-------------------------------|
| `round1.*`     | "Round one"                   |
| `round2.*`     | "Round two"                   |
| `round3.*`     | "Round three"                 |
| `round4.*`     | "Round four"                  |
| `round5.*`     | "Round five"                  |
| `enemy_down.*` | "Enemy down"                  |
| `red_win.*`    | "Red team wins"               |
| `blue_win.*`   | "Blue team wins"              |
| `match_won.*`  | "Match won" / "Victory"       |
| `match_lost.*` | "Match lost" / "Defeat"       |

## Where to get a proper military voice
- **Generate (easiest):** a TTS like ElevenLabs / PlayHT with a deep male
  "narrator/commander" voice — export each line as mp3, name as above.
- **Record:** voice them yourself and process (lower pitch, add a touch of radio
  EQ/compression).
- **CC0 packs:** sites like Kenney / OpenGameArt have free announcer packs.

Licensing note: only ship files you have rights to (CC0, purchased, or your own)
— this is a real-money game.

To change which clips are expected, edit the `registerVoice({...})` call in
`visual/main.js`.
