# Weapon sound samples

Drop your licensed gunshot files here. The game loads them by name and falls
back to the built-in synthesized sounds for any that are missing.

Expected files (any one extension per weapon — `.mp3`, `.wav`, or `.ogg`):

| File              | Weapon            |
|-------------------|-------------------|
| `rifle.*`         | AK-47             |
| `bullpup.*`       | M4A1 / bullpup    |
| `smg.*`           | Submachine gun    |
| `shotgun.*`       | Shotgun           |
| `sniper.*`        | Sniper rifle      |
| `pistol.*`        | Pistol            |
| `revolver.*`      | Revolver          |

Keep them short (a single shot, ~0.2–0.6s). The game plays one instance per
shot. Licensing note: only add files you have the rights to ship in a
commercial product (CC0 or a purchased license) — this is a real-money game.

To change which filenames are expected, edit the `registerSamples({...})` call
in `visual/main.js`.
