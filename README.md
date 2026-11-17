[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/tacinbau/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/tacinbau/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
# TIDEGATE

TIDEGATE is a browser tower-defense game about holding a harbor against creatures following a winding tidal channel. Build on the marked bank plots, combine weapons, and survive all ten waves with at least one of your ten lives intact. Every creature that reaches the harbor costs one life, including the boss.

## Your defenses

Towers fire automatically at enemies in range. Each has three levels; upgrades improve damage, range, and firing speed, with extra improvements to its special effect.

| Tower | Build cost | Role | Level 2 / 3 upgrade costs |
| --- | ---: | --- | ---: |
| Harpoon | 55 pearls | Fast single-target shots for steady damage. | 65 / 105 pearls |
| Cannon | 100 pearls | Slow, heavy shells that damage groups in a blast radius; upgrades widen the blast. | 110 / 160 pearls |
| Frost | 80 pearls | Light damage plus a temporary movement slow; upgrades strengthen and extend the chill. | 85 / 135 pearls |

Place Frost near overlapping firing zones to give Harpoons and Cannons more time to work. Towers need open plots and cannot be stacked together or built in the channel.

## The incoming tide

There are four enemy types. Brine Skitters (called Skitterers in the world data) are quick, lightly built runners. Shellbacks move slowly but have substantial health and armor that reduces damage from each hit. Spitters have light armor and send traveling brine globs at nearby towers, briefly stopping those towers from firing. The Leviathan is a huge, slow, heavily armored boss with a large health pool that appears in wave 10.

Waves 1–2 introduce Skitters. Shellbacks join in wave 3, and Spitters arrive in wave 5. Waves 6–9 combine increasingly dense groups of all three. Wave 10 sends Shellbacks ahead of the Leviathan, followed by Spitters, more Shellbacks, and Skitters. Later-wave enemies gain health and speed. A wave ends only once every scheduled creature has been killed or has escaped; defeating the Leviathan alone does not finish the final wave.

## Pearls and score

You begin with 180 pearls. Kills pay 8 pearls for a Skitter, 15 for a Shellback, 11 for a Spitter, and 250 for the Leviathan. Clearing waves 1–9 awards 25, 30, 35, 40, 45, 50, 55, 60, and 65 pearls respectively; wave 10 awards 100. Build and upgrade during combat or take your time during the wave-clear intermission. A selected tower can be sold for half its total build and upgrade spending, rounded down.

Kills score ten times their pearl reward, and each cleared wave adds 250 points. Victory adds 3,000 points plus 200 for each remaining life.

## Controls and screens

- **Mouse:** click a tower button, then an empty bank plot to build. Click an existing tower to select it; click it again or use the Upgrade button to buy its next level. Buttons also start, pause, resume, mute, advance, and restart the voyage.
- **1 / 2 / 3:** select Harpoon / Cannon / Frost.
- **Esc or P:** pause or resume combat.
- **M:** toggle sound.
- **Space or Enter:** start from the title, advance from wave-clear, resume from pause, or start again after defeat or victory. A focused button handles these keys as its own activation.
- **T:** cycle the selected tower's targeting between first along the path, last, and strongest by current health.
- **X:** sell the selected tower.

The title screen introduces the voyage. Live play shows the battlefield, pearls, lives, wave, and score. Pause holds the simulation, and leaving the window also pauses combat. The wave-clear screen keeps the battlefield accessible so you can prepare before choosing Next wave. Losing all lives opens the game-over screen with your wave and score; surviving wave 10 opens the victory screen with remaining lives and final score. Both offer another voyage.

## Run locally

Use a current Node.js release with native TypeScript support (Node 22.18+ works). From this repository:

```sh
node serve.ts
```

Open http://localhost:8080 in a desktop browser. To choose another port, use `node serve.ts --port 8081`. The game needs no dependency installation or compilation and uses local static files.

To package the entry:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `game/` and `screenshots/` into `out/` and writes `out/dossier.json`. The dossier has schema `makefun/dossier/v1`, cover index 0, source text, and image records containing `name`, `media_type`, `sha256`, and `base64`. Images are ordered by filename. Each screenshot must fit within 256 KiB for this build.

`shots.json` is a descriptive manifest of the four screenshots with `name` and `caption` fields. The supplied builder does not consume that file or captions, and `main.ts` copies only the game and screenshot directories; neither this README nor the manifest is copied to the output.
