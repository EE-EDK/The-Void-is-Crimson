/**
 * Horror Samples Engine — Howler.js integration for "The Void is Crimson"
 *
 * Manages 48 Ulrich Wehner professional sounds + 10 custom extras via Howler.js.
 * Provides atmosphere crossfading, stinger playback, build-up management,
 * ducking, spatial audio positioning, and combination recipes.
 *
 * Depends on: howler.min.js (loaded before this script)
 * Integrates with: horror-effects.js (shares AudioContext via Howler.ctx)
 *
 * Exposed API: window.HorrorSamples
 *
 * Audio by Ulrich Wehner (CC-BY 4.0) — https://freesound.org/people/Ulrich_Wehner/
 */
(function () {
    'use strict';

    var AUDIO_BASE = 'assets/audio/';

    // =========================================================================
    // SOUND DEFINITIONS
    // =========================================================================

    var STINGERS = {
        sliced:           { src: 'stingers/stinger-01-sliced', pool: 3 },
        evilMirror:       { src: 'stingers/stinger-02-evil-mirror', pool: 2 },
        dontTurnAround:   { src: 'stingers/stinger-03-dont-turn-around', pool: 2 },
        perimeterBreach:  { src: 'stingers/stinger-04-perimeter-breach', pool: 3 },
        harbingersOfDoom: { src: 'stingers/stinger-05-harbingers-of-doom', pool: 2 },
        creakingNoise:    { src: 'stingers/stinger-06-creaking-noise', pool: 2 },
        justTheCat:       { src: 'stingers/stinger-07-just-the-cat', pool: 2 },
        innocentChildren: { src: 'stingers/stinger-08-innocent-children', pool: 2 },
        emptyHallways:    { src: 'stingers/stinger-09-empty-hallways', pool: 2 },
        kitchenAttack:    { src: 'stingers/stinger-10-kitchen-attack', pool: 3 },
        hardCollision:    { src: 'stingers/stinger-11-hard-collision', pool: 3 },
        vampireNest:      { src: 'stingers/stinger-12-vampire-nest', pool: 2 },
        killingMachine:   { src: 'stingers/stinger-13-killing-machine', pool: 3 },
        cruelFate:        { src: 'stingers/stinger-14-cruel-fate', pool: 2 },
        rituals:          { src: 'stingers/stinger-15-rituals', pool: 3 },
        memoryFlash:      { src: 'stingers/stinger-16-memory-flash', pool: 3 }
    };

    var BUILDUPS = {
        hairsStandingUp:      { src: 'buildups/buildup-01-hairs-standing-up' },
        guysWeAreNotAlone:    { src: 'buildups/buildup-02-guys-we-are-not-alone' },
        repressedMemories:    { src: 'buildups/buildup-03-repressed-memories' },
        ghostInTheMachine:    { src: 'buildups/buildup-04-ghost-in-the-machine' },
        creepingDread:        { src: 'buildups/buildup-05-creeping-dread' },
        imaginaryFriend:      { src: 'buildups/buildup-06-imaginary-friend' },
        wakingFromNightmare:  { src: 'buildups/buildup-07-waking-from-nightmare' },
        haveToTellYouSomething: { src: 'buildups/buildup-08-i-have-to-tell-you-something' },
        malevolentSpirit:     { src: 'buildups/buildup-09-malevolent-spirit' },
        witchesCoven:         { src: 'buildups/buildup-10-witches-coven' },
        throughTheDarkCorridor: { src: 'buildups/buildup-11-through-the-dark-corridor' },
        destinyCalling:       { src: 'buildups/buildup-12-destiny-calling' },
        endOfDays:            { src: 'buildups/buildup-13-end-of-days' },
        noItCantBe:           { src: 'buildups/buildup-14-no-it-cant-be' },
        run:                  { src: 'buildups/buildup-15-run' },
        whatTwistedMind:      { src: 'buildups/buildup-16-what-twisted-mind' }
    };

    var ATMOSPHERES = {
        enteringTheHive:          { src: 'atmospheres/atmo-01-entering-the-hive' },
        somethingDoesntFeelRight: { src: 'atmospheres/atmo-02-something-doesnt-feel-right' },
        presenceOfPureEvil:       { src: 'atmospheres/atmo-03-presence-of-pure-evil' },
        afterHumanityLostTheWar:  { src: 'atmospheres/atmo-04-after-humanity-lost-the-war' },
        fearOfTheUnknown:         { src: 'atmospheres/atmo-05-fear-of-the-unknown' },
        theAbyssStaresBack:       { src: 'atmospheres/atmo-06-the-abyss-stares-back' },
        theLair:                  { src: 'atmospheres/atmo-07-the-lair' },
        realmOfShadows:           { src: 'atmospheres/atmo-08-realm-of-shadows' },
        forbiddenFruit:           { src: 'atmospheres/atmo-09-forbidden-fruit' },
        curiosityKilledTheFratBoy: { src: 'atmospheres/atmo-10-curiosity-killed-the-frat-boy' },
        tiptoeing:                { src: 'atmospheres/atmo-11-tiptoeing' },
        mrNefarious:              { src: 'atmospheres/atmo-12-mr-nefarious' },
        feverdream:               { src: 'atmospheres/atmo-13-feverdream' },
        infernalMachinery:        { src: 'atmospheres/atmo-14-infernal-machinery' },
        impending:                { src: 'atmospheres/atmo-15-impending' },
        collisionCourse:          { src: 'atmospheres/atmo-16-collision-course' }
    };

    var EXTRAS = {
        violaDrone:       { src: 'extras/viola-drone', loop: true, maxVol: 0.35, reverbSend: 0.15 },
        radioStatic:      { src: 'extras/radio-static', loop: false, maxVol: 0.20, reverbSend: 0 },
        crowdMurmur:      { src: 'extras/crowd-murmur', loop: false, maxVol: 0.50, reverbSend: 0.2 },
        voidWind:         { src: 'extras/void-wind', loop: true, maxVol: 0.30, reverbSend: 0 },
        clockTicking:     { src: 'extras/clock-ticking', loop: false, maxVol: 0.35, reverbSend: 0 },
        crystalResonance: { src: 'extras/crystal-resonance', loop: false, maxVol: 0.35, reverbSend: 0 },
        heartbeatStopping: { src: 'extras/heartbeat-stopping', loop: false, maxVol: 0.30, reverbSend: 0.1 },
        childLullaby:     { src: 'extras/child-lullaby', loop: false, maxVol: 0.15, reverbSend: 0.2 },
        metalGroaning:    { src: 'extras/metal-groaning', loop: false, maxVol: 0.40, reverbSend: 0.15 },
        reversedSpeech:   { src: 'extras/reversed-speech', loop: false, maxVol: 0.15, reverbSend: 0.25 }
    };

    // =========================================================================
    // STATE
    // =========================================================================
    var howls = {};           // key → Howl instance
    var loaded = false;
    var loadedCount = 0;
    var totalCount = 0;

    // Current atmosphere state
    var currentAtmoKey = null;
    var currentAtmoHowl = null;
    var currentAtmoId = null;

    // Current build-up state
    var currentBuildupKey = null;
    var currentBuildupHowl = null;
    var currentBuildupId = null;

    // Active extras tracking (key → { howl, id })
    var activeExtras = {};

    // Audio bus nodes (set during integration with horror-effects.js)
    var sampleBus = null;
    var atmosphereBus = null;
    var stingerBus = null;

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    function createHowl(key, def, category) {
        var opts = {
            src: [AUDIO_BASE + def.src + '.ogg', AUDIO_BASE + def.src + '.mp3'],
            preload: true,
            html5: false, // Use Web Audio for spatial support
            volume: 0,
            onload: function () {
                loadedCount++;
                if (loadedCount >= totalCount) {
                    loaded = true;
                    if (typeof window.HorrorSamplesReady === 'function') {
                        window.HorrorSamplesReady();
                    }
                }
            },
            onloaderror: function (id, err) {
                console.warn('HorrorSamples: Failed to load ' + key + ':', err);
                loadedCount++;
                if (loadedCount >= totalCount) loaded = true;
            }
        };

        if (category === 'atmosphere') {
            opts.loop = true;
        }
        if (def.loop) {
            opts.loop = true;
        }
        if (def.pool) {
            opts.pool = def.pool;
        }

        howls[key] = new Howl(opts);
    }

    function loadAllSounds() {
        var key;
        totalCount = 0;

        for (key in STINGERS) totalCount++;
        for (key in BUILDUPS) totalCount++;
        for (key in ATMOSPHERES) totalCount++;
        for (key in EXTRAS) totalCount++;

        for (key in STINGERS) createHowl(key, STINGERS[key], 'stinger');
        for (key in BUILDUPS) createHowl(key, BUILDUPS[key], 'buildup');
        for (key in ATMOSPHERES) createHowl(key, ATMOSPHERES[key], 'atmosphere');
        for (key in EXTRAS) createHowl(key, EXTRAS[key], 'extra');
    }

    // =========================================================================
    // BUS SETUP (called from horror-effects.js after AudioContext is ready)
    // =========================================================================
    function setupBuses(sBus, aBus, stBus) {
        sampleBus = sBus;
        atmosphereBus = aBus;
        stingerBus = stBus;

        // Route Howler master gain through our sample bus
        if (typeof Howler !== 'undefined' && Howler.masterGain) {
            try {
                Howler.masterGain.disconnect();
                Howler.masterGain.connect(sampleBus);
            } catch (e) {
                console.warn('HorrorSamples: Could not reroute Howler:', e);
            }
        }
    }

    // =========================================================================
    // ATMOSPHERE MANAGEMENT (crossfade between atmospheres)
    // =========================================================================
    function playAtmosphere(key, vol, fadeDuration) {
        if (!howls[key]) return;
        vol = Math.min(vol || 0.20, 0.35); // Cap per governance
        fadeDuration = fadeDuration || 3000;

        // Same atmosphere already playing? Just adjust volume
        if (currentAtmoKey === key && currentAtmoHowl) {
            currentAtmoHowl.fade(currentAtmoHowl.volume(currentAtmoId), vol, 1000, currentAtmoId);
            return;
        }

        // Crossfade: fade out old, fade in new
        if (currentAtmoHowl && currentAtmoId !== null) {
            var oldHowl = currentAtmoHowl;
            var oldId = currentAtmoId;
            oldHowl.fade(oldHowl.volume(oldId), 0, fadeDuration, oldId);
            setTimeout(function () {
                oldHowl.stop(oldId);
            }, fadeDuration + 100);
        }

        currentAtmoKey = key;
        currentAtmoHowl = howls[key];
        currentAtmoHowl.volume(0);
        currentAtmoId = currentAtmoHowl.play();
        currentAtmoHowl.fade(0, vol, fadeDuration, currentAtmoId);
    }

    function stopAtmosphere(fadeDuration) {
        fadeDuration = fadeDuration || 3000;
        if (currentAtmoHowl && currentAtmoId !== null) {
            var h = currentAtmoHowl;
            var id = currentAtmoId;
            h.fade(h.volume(id), 0, fadeDuration, id);
            setTimeout(function () { h.stop(id); }, fadeDuration + 100);
        }
        currentAtmoKey = null;
        currentAtmoHowl = null;
        currentAtmoId = null;
    }

    // =========================================================================
    // DUCKING (reduce atmosphere volume when stingers fire)
    // =========================================================================
    function duckAtmosphere(duration) {
        if (!currentAtmoHowl || currentAtmoId === null) return;
        var original = currentAtmoHowl.volume(currentAtmoId);
        if (original <= 0.02) return; // Already silent
        currentAtmoHowl.fade(original, original * 0.7, 200, currentAtmoId);
        setTimeout(function () {
            if (currentAtmoHowl && currentAtmoId !== null) {
                currentAtmoHowl.fade(currentAtmoHowl.volume(currentAtmoId), original, 2000, currentAtmoId);
            }
        }, duration || 1500);
    }

    // =========================================================================
    // STINGER PLAYBACK
    // =========================================================================
    function playStinger(key, opts) {
        if (!howls[key]) return null;
        opts = opts || {};
        var vol = Math.min(opts.vol || 0.5, 0.8);  // Cap at 0.8
        var rate = opts.rate || 1.0;
        var pan = opts.pan || 0;
        var delay = opts.delay || 0;

        function fire() {
            var h = howls[key];
            h.volume(vol);
            h.rate(rate);
            h.stereo(pan);
            var id = h.play();

            // Spatial positioning if provided
            if (opts.pos) {
                h.pos(opts.pos[0], opts.pos[1], opts.pos[2], id);
            }

            // Duck atmosphere when stinger fires
            duckAtmosphere(1500);

            return id;
        }

        if (delay > 0) {
            setTimeout(fire, delay);
            return null;
        }
        return fire();
    }

    // =========================================================================
    // BUILD-UP PLAYBACK
    // =========================================================================
    function playBuildup(key, opts) {
        if (!howls[key]) return null;
        opts = opts || {};
        var vol = Math.min(opts.vol || 0.35, 0.6); // Cap at 0.6
        var rate = opts.rate || 1.0;
        var fadeDuration = opts.fade || 3000;

        // Stop current build-up if playing
        if (currentBuildupHowl && currentBuildupId !== null) {
            var oldH = currentBuildupHowl;
            var oldId = currentBuildupId;
            oldH.fade(oldH.volume(oldId), 0, 1500, oldId);
            setTimeout(function () { oldH.stop(oldId); }, 1600);
        }

        var h = howls[key];
        h.volume(0);
        h.rate(rate);
        currentBuildupKey = key;
        currentBuildupHowl = h;
        currentBuildupId = h.play();
        h.fade(0, vol, fadeDuration, currentBuildupId);

        // Chain callback
        if (opts.onEnd) {
            h.once('end', opts.onEnd, currentBuildupId);
        }

        return currentBuildupId;
    }

    function stopBuildup(fadeDuration) {
        fadeDuration = fadeDuration || 1500;
        if (currentBuildupHowl && currentBuildupId !== null) {
            var h = currentBuildupHowl;
            var id = currentBuildupId;
            h.fade(h.volume(id), 0, fadeDuration, id);
            setTimeout(function () { h.stop(id); }, fadeDuration + 100);
        }
        currentBuildupKey = null;
        currentBuildupHowl = null;
        currentBuildupId = null;
    }

    // =========================================================================
    // EXTRAS PLAYBACK
    // =========================================================================
    function playExtra(key, opts) {
        var def = EXTRAS[key];
        if (!def || !howls[key]) return null;
        opts = opts || {};
        var vol = Math.min(opts.vol || 0.15, def.maxVol);
        var rate = opts.rate || 1.0;
        var fadeDuration = opts.fade || 0;
        var pan = opts.pan || 0;

        // Stop previous instance of this extra if playing
        if (activeExtras[key]) {
            var old = activeExtras[key];
            old.howl.fade(old.howl.volume(old.id), 0, 500, old.id);
            setTimeout(function () { old.howl.stop(old.id); }, 600);
        }

        var h = howls[key];
        h.volume(fadeDuration > 0 ? 0 : vol);
        h.rate(rate);
        h.stereo(pan);
        var id = h.play();

        if (fadeDuration > 0) {
            h.fade(0, vol, fadeDuration, id);
        }

        // Spatial positioning
        if (opts.pos) {
            h.pos(opts.pos[0], opts.pos[1], opts.pos[2], id);
        }

        activeExtras[key] = { howl: h, id: id };

        // Auto-cleanup on end (non-looping)
        if (!def.loop) {
            h.once('end', function () {
                delete activeExtras[key];
            }, id);
        }

        // Duration limit
        if (opts.duration) {
            setTimeout(function () {
                stopExtra(key, opts.fadeOut || 1000);
            }, opts.duration);
        }

        return id;
    }

    function stopExtra(key, fadeDuration) {
        fadeDuration = fadeDuration || 1000;
        var entry = activeExtras[key];
        if (!entry) return;
        entry.howl.fade(entry.howl.volume(entry.id), 0, fadeDuration, entry.id);
        setTimeout(function () {
            entry.howl.stop(entry.id);
            delete activeExtras[key];
        }, fadeDuration + 100);
    }

    function stopAllExtras(fadeDuration) {
        for (var key in activeExtras) {
            stopExtra(key, fadeDuration);
        }
    }

    // =========================================================================
    // SPATIAL HELPERS
    // =========================================================================
    function orbitSound(key, radius, periodMs, durationMs) {
        var entry = activeExtras[key] || null;
        if (!entry) return;
        var h = entry.howl;
        var id = entry.id;
        var startTime = Date.now();
        var interval = setInterval(function () {
            var elapsed = Date.now() - startTime;
            if (durationMs && elapsed > durationMs) {
                clearInterval(interval);
                return;
            }
            var angle = (elapsed / periodMs) * Math.PI * 2;
            var x = Math.cos(angle) * radius;
            var z = Math.sin(angle) * radius;
            h.pos(x, 0, z, id);
        }, 50);
    }

    function moveToward(key, fromPos, toPos, durationMs) {
        var entry = activeExtras[key] || null;
        if (!entry) return;
        var h = entry.howl;
        var id = entry.id;
        var startTime = Date.now();
        var interval = setInterval(function () {
            var elapsed = Date.now() - startTime;
            var t = Math.min(elapsed / durationMs, 1);
            var x = fromPos[0] + (toPos[0] - fromPos[0]) * t;
            var y = fromPos[1] + (toPos[1] - fromPos[1]) * t;
            var z = fromPos[2] + (toPos[2] - fromPos[2]) * t;
            h.pos(x, y, z, id);
            if (t >= 1) clearInterval(interval);
        }, 50);
    }

    // =========================================================================
    // COMBINATION RECIPES
    // =========================================================================
    var Recipes = {
        cosmicRevelation: function (stingerKey, buildupKey, extraKey, opts) {
            opts = opts || {};
            playStinger(stingerKey || 'harbingersOfDoom', { vol: opts.stingerVol || 0.6 });
            if (buildupKey) playBuildup(buildupKey, { vol: opts.buildupVol || 0.4 });
            if (extraKey) playExtra(extraKey, { vol: opts.extraVol || 0.25, fade: 1000 });
            duckAtmosphere(2000);
        },

        memoryFracture: function (opts) {
            opts = opts || {};
            playStinger('memoryFlash', { vol: opts.vol || 0.5 });
            if (opts.reversed !== false) {
                playExtra('reversedSpeech', { vol: 0.12, rate: 0.8, pan: opts.pan || 0 });
            }
        },

        theLullaby: function (opts) {
            opts = opts || {};
            playExtra('childLullaby', { vol: opts.lullabyVol || 0.10, rate: opts.rate || 0.85 });
            playExtra('violaDrone', { vol: opts.droneVol || 0.08, fade: 3000 });
        },

        emotionalFlood: function (opts) {
            opts = opts || {};
            playExtra('crowdMurmur', {
                vol: opts.vol || 0.4,
                fade: opts.fade || 3000,
                pos: opts.fromPos || [0, 0, 20]
            });
            if (opts.fromPos && opts.toPos) {
                moveToward('crowdMurmur', opts.fromPos, opts.toPos, opts.moveDuration || 5000);
            }
            if (opts.heartbeat) {
                playExtra('heartbeatStopping', { vol: 0.20, fade: 1000 });
            }
            duckAtmosphere(opts.duckDuration || 5000);
        },

        alienPresence: function (opts) {
            opts = opts || {};
            playExtra('crystalResonance', {
                vol: opts.vol || 0.25,
                pos: opts.pos || [0, 0, -3]
            });
            if (opts.stinger) {
                playStinger(opts.stinger, { vol: opts.stingerVol || 0.5 });
            }
        },

        theVoid: function (opts) {
            opts = opts || {};
            playExtra('voidWind', {
                vol: opts.vol || 0.20,
                rate: opts.rate || 0.7,
                fade: 2000,
                pos: opts.pos || [0, -3, 0]
            });
            if (opts.reversed) {
                playExtra('reversedSpeech', { vol: 0.08, rate: 0.7 });
            }
        },

        countdown: function (count, opts) {
            opts = opts || {};
            var tickVol = 0.15 + (count / 3) * 0.2;
            playExtra('clockTicking', { vol: Math.min(tickVol, 0.35) });
            playStinger('rituals', { vol: 0.3 + (count / 3) * 0.4, rate: 0.9 + (count / 3) * 0.1 });
            if (count >= 3) {
                // Final count: stop clock, fire impact
                setTimeout(function () {
                    stopExtra('clockTicking', 50);
                    playStinger('killingMachine', { vol: 0.7 });
                    duckAtmosphere(3000);
                }, 300);
            }
        }
    };

    // =========================================================================
    // FADE ALL (for scene transitions and endings)
    // =========================================================================
    function fadeAll(duration) {
        duration = duration || 5000;
        stopAtmosphere(duration);
        stopBuildup(duration);
        stopAllExtras(duration);
    }

    // =========================================================================
    // DATA-ATTRIBUTE HANDLER (called from horror-effects.js IntersectionObserver)
    // =========================================================================
    function handleTriggerElement(el) {
        if (!loaded) return;

        // data-stinger="key" data-stinger-vol="0.5" data-stinger-rate="1.0" data-stinger-pan="0"
        var stingerKey = el.dataset.stinger;
        if (stingerKey && howls[stingerKey]) {
            playStinger(stingerKey, {
                vol: parseFloat(el.dataset.stingerVol) || 0.5,
                rate: parseFloat(el.dataset.stingerRate) || 1.0,
                pan: parseFloat(el.dataset.stingerPan) || 0,
                delay: parseInt(el.dataset.stingerDelay, 10) || 0
            });
        }

        // data-buildup="key" data-buildup-vol="0.35" data-buildup-fade="3000"
        var buildupKey = el.dataset.buildup;
        if (buildupKey && howls[buildupKey]) {
            playBuildup(buildupKey, {
                vol: parseFloat(el.dataset.buildupVol) || 0.35,
                rate: parseFloat(el.dataset.buildupRate) || 1.0,
                fade: parseInt(el.dataset.buildupFade, 10) || 3000
            });
        }

        // data-atmosphere="key" data-atmosphere-vol="0.20"
        var atmoKey = el.dataset.atmosphere;
        if (atmoKey && howls[atmoKey]) {
            playAtmosphere(atmoKey, parseFloat(el.dataset.atmosphereVol) || 0.20);
        }

        // data-extra="key" data-extra-vol="0.15" data-extra-rate="1.0" data-extra-pan="0"
        var extraKey = el.dataset.extra;
        if (extraKey && howls[extraKey]) {
            playExtra(extraKey, {
                vol: parseFloat(el.dataset.extraVol) || 0.15,
                rate: parseFloat(el.dataset.extraRate) || 1.0,
                pan: parseFloat(el.dataset.extraPan) || 0,
                fade: parseInt(el.dataset.extraFade, 10) || 0,
                duration: parseInt(el.dataset.extraDuration, 10) || 0
            });
        }

        // data-extra2="key" (second simultaneous extra)
        var extra2Key = el.dataset.extra2;
        if (extra2Key && howls[extra2Key]) {
            playExtra(extra2Key, {
                vol: parseFloat(el.dataset.extra2Vol) || 0.10,
                rate: parseFloat(el.dataset.extra2Rate) || 1.0,
                pan: parseFloat(el.dataset.extra2Pan) || 0,
                fade: parseInt(el.dataset.extra2Fade, 10) || 0
            });
        }

        // data-recipe="recipeName" (fire a combination recipe)
        var recipe = el.dataset.recipe;
        if (recipe && Recipes[recipe]) {
            Recipes[recipe]({
                vol: parseFloat(el.dataset.recipeVol) || undefined,
                stinger: el.dataset.recipeStinger || undefined,
                stingerVol: parseFloat(el.dataset.recipeStingerVol) || undefined
            });
        }
    }

    // =========================================================================
    // LOAD ON MODULE INIT
    // =========================================================================
    if (typeof Howl !== 'undefined') {
        loadAllSounds();
    } else {
        console.warn('HorrorSamples: Howler.js not found — samples will not load.');
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================
    window.HorrorSamples = {
        // Core playback
        playAtmosphere: playAtmosphere,
        stopAtmosphere: stopAtmosphere,
        playStinger: playStinger,
        playBuildup: playBuildup,
        stopBuildup: stopBuildup,
        playExtra: playExtra,
        stopExtra: stopExtra,
        stopAllExtras: stopAllExtras,

        // Ducking
        duckAtmosphere: duckAtmosphere,

        // Spatial
        orbitSound: orbitSound,
        moveToward: moveToward,

        // Recipes
        recipes: Recipes,

        // Integration
        setupBuses: setupBuses,
        handleTriggerElement: handleTriggerElement,
        fadeAll: fadeAll,

        // State queries
        isLoaded: function () { return loaded; },
        getLoadProgress: function () { return totalCount > 0 ? loadedCount / totalCount : 0; },
        getCurrentAtmosphere: function () { return currentAtmoKey; },

        // Direct howl access for advanced use
        getHowl: function (key) { return howls[key] || null; }
    };

})();
