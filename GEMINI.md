# GEMINI Mandates

This file contains persistent instructions and context for Gemini CLI when working on "The Void at Crimson Sunset" project.

## Project Structure
- **HTML Files:** Located in the root directory.
- **CSS:** Located in `assets/css/`.
- **JavaScript:** Located in `assets/js/`.
- **Audio Samples:** Located in `assets/audio/` (stingers/, buildups/, atmospheres/, extras/).
- **Media (Video):** Located in `assets/video/`.
- **Documentation:** Located in `docs/`.

## Audio System
- **horror-effects.js**: Web Audio API synthesis engine (drone, whispers, impacts, binaural) + visual effects. Creates shared AudioContext with Howler.js, routes through limiter at -6dB.
- **horror-samples.js**: Howler.js integration for 58 pre-recorded sounds. API: `window.HorrorSamples` with methods for atmosphere crossfading, stinger/buildup playback, extras, ducking, spatial audio, and combination recipes.
- **howler.min.js**: Howler.js library (core + spatial plugin). Loaded before horror-samples.js.
- **Script load order**: howler.min.js -> horror-samples.js -> horror-effects.js (all deferred).
- **Trigger attributes on HTML elements**: `data-horror` (synth effect), `data-stinger`, `data-buildup`, `data-atmosphere`, `data-extra`, `data-extra2` (Howler samples), plus vol/rate/pan/fade/delay modifiers.
- **Bus topology**: sampleBus(0.50) -> master(0.30) -> limiter -> destination. Sub-buses: atmosphereBus(0.25), stingerBus(0.70).
- **Audio credits**: 48 sounds by Ulrich Wehner (CC-BY 4.0), 10 custom extras.

## Coding Standards
- Maintain the horror/dark aesthetic in all visual updates.
- Use Vanilla CSS for styling (prefer it over frameworks).
- Ensure Three.js (r160) is used for 3D effects.
- IIFE pattern for JS scope isolation, `'use strict'`.
- Always verify pathing to assets after any structural changes.
- Audio sample volumes capped per governance: atmospheres max 0.35, stingers max 0.8, extras per-sound caps in horror-samples.js.
