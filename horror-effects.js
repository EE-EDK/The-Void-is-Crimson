/**
 * Horror Effects Engine for "The Void at Crimson Sunset"
 *
 * Manages ambient audio (Web Audio API), visual distortions, and interactive
 * horror elements. All audio requires user interaction to initialize per
 * browser autoplay policies.
 *
 * Usage: Include this script on any page. Add CSS classes to elements:
 *   .horror-trigger[data-horror="scramble|glitch|heartbeat|flicker|intensify|calm|whisper-burst"]
 *   .horror-whisper[data-whisper="hidden message text"]
 *
 * Exposed API: window.HorrorEngine
 */
(function () {
    'use strict';

    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    const CONFIG = {
        audio: {
            masterVolume: 0.15,
            droneBase: 0.06,
            whisperVolume: 0.035,
            heartbeatVolume: 0.07,
            sharpVolume: 0.025,
        },
        visual: {
            flickerDuration: 120,
            scrambleDuration: 900,
            vignetteMin: 0,
            vignetteMax: 0.45,
        },
        timing: {
            whisperRange: [18000, 50000],
            ambientRange: [25000, 70000],
        },
    };

    // =========================================================================
    // AUDIO ENGINE
    // =========================================================================
    let ctx = null;
    let master = null;
    let ready = false;
    let droneGain = null;
    let droneSources = [];

    function initAudio() {
        if (ready) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            master = ctx.createGain();
            master.gain.value = CONFIG.audio.masterVolume;
            master.connect(ctx.destination);
            if (ctx.state === 'suspended') ctx.resume();
            ready = true;
            startDrone();
            scheduleWhisper();
        } catch (e) {
            console.warn('Horror audio unavailable:', e);
        }
    }

    // --- AMBIENT DRONE ---
    function startDrone() {
        if (!ready) return;

        droneGain = ctx.createGain();
        droneGain.gain.value = 0;
        droneGain.connect(master);
        droneGain.gain.linearRampToValueAtTime(CONFIG.audio.droneBase, ctx.currentTime + 5);

        // Sub-bass foundation
        const bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.value = 42;
        bass.connect(droneGain);
        bass.start();
        droneSources.push(bass);

        // Dissonant tritone overtone
        const tritone = ctx.createOscillator();
        tritone.type = 'sine';
        tritone.frequency.value = 59.5; // ~tritone from bass
        const tGain = ctx.createGain();
        tGain.gain.value = 0.25;
        tritone.connect(tGain);
        tGain.connect(droneGain);
        tritone.start();
        droneSources.push(tritone);

        // Slow LFO detuning the bass
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.04;
        const lfoAmt = ctx.createGain();
        lfoAmt.gain.value = 1.5;
        lfo.connect(lfoAmt);
        lfoAmt.connect(bass.frequency);
        lfo.start();
        droneSources.push(lfo);

        // High ghost tone — barely audible, creates unease
        const ghost = ctx.createOscillator();
        ghost.type = 'sine';
        ghost.frequency.value = 18200; // Near hearing threshold
        const ghostGain = ctx.createGain();
        ghostGain.gain.value = 0.008;
        ghost.connect(ghostGain);
        ghostGain.connect(droneGain);
        ghost.start();
        droneSources.push(ghost);

        // Filtered noise layer (wind / breath)
        const bufLen = ctx.sampleRate * 4;
        const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const nd = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        noise.loop = true;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 180;
        bp.Q.value = 0.6;

        const nGain = ctx.createGain();
        nGain.gain.value = 0.018;

        noise.connect(bp);
        bp.connect(nGain);
        nGain.connect(droneGain);
        noise.start();
        droneSources.push(noise);
    }

    function setDroneIntensity(intensity) {
        if (!ready || !droneGain) return;
        const vol = CONFIG.audio.droneBase * (1 + intensity * 4);
        droneGain.gain.linearRampToValueAtTime(
            Math.min(vol, 0.35),
            ctx.currentTime + 1.5
        );
    }

    // --- WHISPERS ---
    function scheduleWhisper() {
        if (!ready) return;
        const delay = CONFIG.timing.whisperRange[0] +
            Math.random() * (CONFIG.timing.whisperRange[1] - CONFIG.timing.whisperRange[0]);
        setTimeout(() => {
            playWhisper();
            scheduleWhisper();
        }, delay);
    }

    function playWhisper() {
        if (!ready || document.hidden) return;

        const dur = 1.2 + Math.random() * 2;
        const now = ctx.currentTime;
        const len = ctx.sampleRate * dur;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);

        // Amplitude-modulated noise — speech-like cadence
        for (let i = 0; i < len; i++) {
            const mod = Math.sin(i / ctx.sampleRate * Math.PI * (3 + Math.random() * 5));
            d[i] = (Math.random() * 2 - 1) * Math.max(0, mod) * 0.4;
        }

        const src = ctx.createBufferSource();
        src.buffer = buf;

        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 700 + Math.random() * 1400;
        filt.Q.value = 2.5;

        const g = ctx.createGain();
        g.gain.value = 0;
        g.gain.linearRampToValueAtTime(CONFIG.audio.whisperVolume, now + 0.25);
        g.gain.linearRampToValueAtTime(0, now + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.8;

        src.connect(filt);
        filt.connect(g);
        g.connect(pan);
        pan.connect(master);
        src.start(now);
        src.stop(now + dur);
    }

    // --- HEARTBEAT ---
    function playHeartbeat(beats) {
        if (!ready) return;
        beats = beats || 4;
        const now = ctx.currentTime;

        for (let i = 0; i < beats; i++) {
            const t = now + i * 0.82;

            // Lub
            const o1 = ctx.createOscillator();
            o1.type = 'sine';
            o1.frequency.setValueAtTime(55, t);
            o1.frequency.exponentialRampToValueAtTime(28, t + 0.15);
            const g1 = ctx.createGain();
            g1.gain.setValueAtTime(0, t);
            g1.gain.linearRampToValueAtTime(CONFIG.audio.heartbeatVolume, t + 0.02);
            g1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            o1.connect(g1);
            g1.connect(master);
            o1.start(t);
            o1.stop(t + 0.35);

            // Dub
            const o2 = ctx.createOscillator();
            o2.type = 'sine';
            o2.frequency.value = 38;
            const g2 = ctx.createGain();
            g2.gain.setValueAtTime(0, t + 0.2);
            g2.gain.linearRampToValueAtTime(CONFIG.audio.heartbeatVolume * 0.55, t + 0.22);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            o2.connect(g2);
            g2.connect(master);
            o2.start(t + 0.18);
            o2.stop(t + 0.55);
        }

        // Pulse vignette with heartbeat
        let beat = 0;
        const pulse = setInterval(() => {
            if (beat >= beats) { clearInterval(pulse); return; }
            setVignetteIntensity(0.55);
            setTimeout(() => setVignetteIntensity(scrollIntensity * 0.3), 300);
            beat++;
        }, 820);
    }

    // --- SHARP DISSONANT TONE ---
    function playSharpTone() {
        if (!ready) return;
        const now = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = 2200 + Math.random() * 2800;

        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1800;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(CONFIG.audio.sharpVolume, now + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        o.connect(hp);
        hp.connect(g);
        g.connect(master);
        o.start(now);
        o.stop(now + 0.5);
    }

    // --- LOW RUMBLE (for void / descent moments) ---
    function playRumble(duration) {
        if (!ready) return;
        duration = duration || 3;
        const now = ctx.currentTime;

        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = 25;

        const lfo2 = ctx.createOscillator();
        lfo2.type = 'sine';
        lfo2.frequency.value = 0.3;
        const lfoG = ctx.createGain();
        lfoG.gain.value = 8;
        lfo2.connect(lfoG);
        lfoG.connect(o.frequency);
        lfo2.start(now);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.12, now + duration * 0.3);
        g.gain.linearRampToValueAtTime(0, now + duration);

        o.connect(g);
        g.connect(master);
        o.start(now);
        o.stop(now + duration);
        lfo2.stop(now + duration);
    }

    // =========================================================================
    // VISUAL EFFECTS
    // =========================================================================

    // --- VIGNETTE OVERLAY ---
    const vignette = document.createElement('div');
    vignette.id = 'horror-vignette';
    vignette.setAttribute('aria-hidden', 'true');
    document.body.appendChild(vignette);

    function setVignetteIntensity(v) {
        vignette.style.opacity = CONFIG.visual.vignetteMin +
            v * (CONFIG.visual.vignetteMax - CONFIG.visual.vignetteMin);
    }

    // --- SCREEN GLITCH ---
    function glitchEffect() {
        const ov = document.createElement('div');
        ov.className = 'horror-glitch-overlay';
        ov.setAttribute('aria-hidden', 'true');
        document.body.appendChild(ov);
        setTimeout(() => ov.remove(), CONFIG.visual.flickerDuration);
    }

    // --- TEXT SCRAMBLE ---
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%&*';

    function scrambleText(el) {
        if (el.dataset.scrambled) return;
        el.dataset.scrambled = '1';

        const orig = el.textContent;
        const dur = CONFIG.visual.scrambleDuration;
        const t0 = performance.now();

        function tick(now) {
            const p = Math.min((now - t0) / dur, 1);
            let out = '';
            for (let i = 0; i < orig.length; i++) {
                if (orig[i] === ' ' || orig[i] === '\n') { out += orig[i]; continue; }
                out += (i / orig.length < p) ? orig[i] : CHARS[Math.floor(Math.random() * CHARS.length)];
            }
            el.textContent = out;
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = orig;
        }
        requestAnimationFrame(tick);
    }

    // --- SCREEN FLICKER ---
    function screenFlicker() {
        document.body.classList.add('horror-flicker');
        setTimeout(() => document.body.classList.remove('horror-flicker'), 80);
        setTimeout(() => {
            document.body.classList.add('horror-flicker');
            setTimeout(() => document.body.classList.remove('horror-flicker'), 40);
        }, 160);
    }

    // --- TEXT BLEED (red shadow that fades in/out on horror paragraphs) ---
    function textBleed(el) {
        el.classList.add('horror-text-bleed');
        setTimeout(() => el.classList.remove('horror-text-bleed'), 3000);
    }

    // =========================================================================
    // INTERACTIVE ELEMENTS
    // =========================================================================

    // --- WHISPER TEXT (hidden messages revealed on hover) ---
    function setupWhisperText() {
        document.querySelectorAll('.horror-whisper').forEach(el => {
            el.addEventListener('mouseenter', () => {
                el.classList.add('horror-whisper-visible');
                if (ready) playWhisper();
            });
            el.addEventListener('mouseleave', () => {
                el.classList.remove('horror-whisper-visible');
            });
        });
    }

    // --- CURSOR TRAIL ---
    let cursorTrailOn = false;

    function setupCursorTrail() {
        if ('ontouchstart' in window) return;

        let lastX = 0, lastY = 0;
        document.addEventListener('mousemove', (e) => {
            if (!cursorTrailOn) return;
            // Throttle: only spawn dot if moved enough
            const dx = e.clientX - lastX, dy = e.clientY - lastY;
            if (dx * dx + dy * dy < 100) return;
            lastX = e.clientX;
            lastY = e.clientY;

            const dot = document.createElement('div');
            dot.className = 'horror-cursor-dot';
            dot.style.left = e.clientX + 'px';
            dot.style.top = e.clientY + 'px';
            dot.setAttribute('aria-hidden', 'true');
            document.body.appendChild(dot);
            setTimeout(() => dot.remove(), 1200);
        });
    }

    // --- HORROR TRIGGER ZONES (IntersectionObserver) ---
    function setupScrollTriggers() {
        const triggers = document.querySelectorAll('.horror-trigger');
        if (!triggers.length) return;

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                if (el.dataset.horrorFired) return;
                el.dataset.horrorFired = '1';

                const fx = el.dataset.horror;
                if (!fx) return;

                switch (fx) {
                    case 'scramble':
                        scrambleText(el);
                        break;
                    case 'glitch':
                        glitchEffect();
                        if (ready) playSharpTone();
                        break;
                    case 'heartbeat':
                        if (ready) playHeartbeat();
                        setVignetteIntensity(0.6);
                        setTimeout(() => setVignetteIntensity(scrollIntensity * 0.3), 4000);
                        break;
                    case 'flicker':
                        screenFlicker();
                        break;
                    case 'intensify':
                        setDroneIntensity(0.8);
                        cursorTrailOn = true;
                        setVignetteIntensity(0.45);
                        break;
                    case 'calm':
                        setDroneIntensity(0.15);
                        cursorTrailOn = false;
                        setVignetteIntensity(0.05);
                        break;
                    case 'whisper-burst':
                        if (ready) {
                            playWhisper();
                            setTimeout(playWhisper, 400);
                            setTimeout(playWhisper, 900);
                        }
                        break;
                    case 'rumble':
                        if (ready) playRumble(4);
                        setVignetteIntensity(0.5);
                        setTimeout(() => setVignetteIntensity(scrollIntensity * 0.3), 4500);
                        break;
                    case 'bleed':
                        textBleed(el);
                        break;
                }
            });
        }, { threshold: 0.35 });

        triggers.forEach(t => obs.observe(t));
    }

    // --- RANDOM AMBIENT EVENTS ---
    function scheduleAmbientEvent() {
        const delay = CONFIG.timing.ambientRange[0] +
            Math.random() * (CONFIG.timing.ambientRange[1] - CONFIG.timing.ambientRange[0]);

        setTimeout(() => {
            if (!document.hidden) {
                const r = Math.random();
                if (r < 0.25) screenFlicker();
                else if (r < 0.45) glitchEffect();
                else if (r < 0.65) {
                    setVignetteIntensity(0.5);
                    setTimeout(() => setVignetteIntensity(scrollIntensity * 0.3), 1000);
                } else if (r < 0.80 && ready) {
                    playWhisper();
                }
                // 20% chance: nothing (silence is its own horror)
            }
            scheduleAmbientEvent();
        }, delay);
    }

    // =========================================================================
    // SCROLL-BASED INTENSITY
    // =========================================================================
    let scrollIntensity = 0;

    function updateScrollIntensity() {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        if (total <= 0) return;
        const pct = window.scrollY / total;
        scrollIntensity = Math.min(pct * 1.4, 1);
        setVignetteIntensity(scrollIntensity * 0.25);
        setDroneIntensity(scrollIntensity * 0.4);
    }

    let sTicking = false;
    window.addEventListener('scroll', () => {
        if (!sTicking) {
            requestAnimationFrame(() => { updateScrollIntensity(); sTicking = false; });
            sTicking = true;
        }
    }, { passive: true });

    // =========================================================================
    // AUDIO CLICK-TO-START OVERLAY
    // =========================================================================
    function createAudioPrompt() {
        const prompt = document.createElement('div');
        prompt.id = 'horror-audio-prompt';
        prompt.setAttribute('aria-label', 'Enable audio for immersive experience');
        prompt.innerHTML = '<div class="horror-audio-prompt-inner">' +
            '<div class="horror-audio-icon">&#9835;</div>' +
            '<div class="horror-audio-text">Click anywhere for the full experience</div>' +
            '<div class="horror-audio-sub">Audio enhances this story</div>' +
            '</div>';
        document.body.appendChild(prompt);

        // Fade in
        requestAnimationFrame(() => { prompt.style.opacity = '1'; });

        function dismiss() {
            initAudio();
            prompt.style.opacity = '0';
            setTimeout(() => prompt.remove(), 800);
            document.removeEventListener('click', dismiss);
            document.removeEventListener('keydown', dismiss);
        }

        // Also auto-dismiss after 6 seconds if user just scrolls
        document.addEventListener('click', dismiss);
        document.addEventListener('keydown', dismiss);
        setTimeout(() => {
            if (prompt.parentNode) {
                prompt.style.opacity = '0';
                setTimeout(() => { if (prompt.parentNode) prompt.remove(); }, 800);
            }
        }, 8000);

        // Also init audio on scroll (in case they never click the prompt)
        document.addEventListener('scroll', () => { initAudio(); }, { once: true });
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    function init() {
        setupWhisperText();
        setupCursorTrail();
        setupScrollTriggers();
        scheduleAmbientEvent();

        // Show audio prompt after short delay so page loads first
        setTimeout(createAudioPrompt, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    window.HorrorEngine = {
        playWhisper: playWhisper,
        playHeartbeat: playHeartbeat,
        playSharpTone: playSharpTone,
        playRumble: playRumble,
        glitch: glitchEffect,
        flicker: screenFlicker,
        scramble: scrambleText,
        bleed: textBleed,
        setDroneIntensity: setDroneIntensity,
        setVignetteIntensity: setVignetteIntensity,
        enableTrail: function () { cursorTrailOn = true; },
        disableTrail: function () { cursorTrailOn = false; },
    };

})();
