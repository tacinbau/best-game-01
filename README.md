# Emberlight Keeper

A night-garden arcade game. You are the lantern-keeper of a dark garden where
ember-spirits drift down from the sky. Catch them in your lantern, dodge the
shadow-moths, and light all five garden lanterns to win.

## How to play

- **Goal:** gather the ember quota shown under the lantern count to light each
  garden lantern. Light all five lanterns to win the game.
- **Catch embers:** golden-orange ember-spirits are worth 10 points; rare golden
  embers are worth 25. Catching embers in a row without losing one builds a
  combo that adds bonus points to every catch.
- **Dodge shadow-moths:** one touch costs a life. You have three lives. A moth
  that slips past you scores 1 dodge point.
- **Lose an ember:** an ember that reaches the ground is lost and breaks your combo.
- **Difficulty grows:** every lantern you light makes the embers and moths fall
  faster and more often.

## Controls

- **← → or A / D** — walk left and right
- **Mouse** — the keeper follows the pointer
- **Space / Enter / click** — start, restart
- **P or Esc** — pause / resume
- **M** — mute / unmute the music and sounds

## Screens

Title screen, live play with a HUD (score, lanterns lit, ember quota with a
progress bar, lives, combo), a pause screen, a game-over screen and a win screen
("The garden glows!"), all with restart.

## Sound

All sound is synthesized live with WebAudio — a soft pad loop, catch blips that
rise with your combo, a golden chime, a moth-hit thud, and level-up and win
fanfares. No audio files.

## Running it

Serve `game/` with any static file server (for example `node serve.ts`, then open
http://localhost:8080) and play in desktop Chrome. The game makes no network
requests; every file it loads lives under `game/`.

Deterministic screenshot scenes are available with
`?shot=start|play|level|end|win&seed=N`.
