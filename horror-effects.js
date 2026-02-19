/**
 * Horror Effects Engine for "The Void at Crimson Sunset"
 *
 * Manages ambient audio (Web Audio API), visual distortions, and interactive
 * horror elements. All audio requires user interaction to initialize per
 * browser autoplay policies.
 *
 * Usage: Include this script on any page. Add CSS classes to elements:
 *   .horror-trigger[data-horror="scramble|glitch|heartbeat|flicker|intensify|calm|whisper-burst|rumble|bleed"]
 *   .horror-whisper[data-whisper="hidden message text"]
 *
 * Exposed API: window.HorrorEngine
 */
(function () {
    'use strict';

    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    var CONFIG = {
        audio: {
            masterVolume: 0.18,
            droneBase: 0.08,
            whisperVolume: 0.05,
            heartbeatVolume: 0.10,
            sharpVolume: 0.04,
        },
        visual: {
            glitchDuration: 350,
            scrambleDuration: 1200,
            vignetteBase: 0.15,       // always-on base vignette
            vignetteMax: 0.75,
            flickerCount: 4,          // number of rapid flashes
        },
        timing: {
            whisperRange: [10000, 30000],
            ambientRange: [8000, 22000],   // much more frequent
            onLoadDelay: 2500,             // first scare after page loads
        },
    };

    // =========================================================================
    // AUDIO ENGINE
    // =========================================================================
    var ctx = null;
    var master = null;
    var ready = false;
    var droneGain = null;

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
        droneGain.gain.linearRampToValueAtTime(CONFIG.audio.droneBase, ctx.currentTime + 4);

        // Sub-bass foundation
        var bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.value = 42;
        bass.connect(droneGain);
        bass.start();

        // Dissonant tritone overtone
        var tritone = ctx.createOscillator();
        tritone.type = 'sine';
        tritone.frequency.value = 59.5;
        var tGain = ctx.createGain();
        tGain.gain.value = 0.3;
        tritone.connect(tGain);
        tGain.connect(droneGain);
        tritone.start();

        // Slow LFO detuning the bass
        var lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.04;
        var lfoAmt = ctx.createGain();
        lfoAmt.gain.value = 2;
        lfo.connect(lfoAmt);
        lfoAmt.connect(bass.frequency);
        lfo.start();

        // High ghost tone
        var ghost = ctx.createOscillator();
        ghost.type = 'sine';
        ghost.frequency.value = 15500;
        var ghostGain = ctx.createGain();
        ghostGain.gain.value = 0.012;
        ghost.connect(ghostGain);
        ghostGain.connect(droneGain);
        ghost.start();

        // Filtered noise layer (wind / breath)
        var bufLen = ctx.sampleRate * 4;
        var noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        var nd = noiseBuf.getChannelData(0);
        for (var i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;

        var noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        noise.loop = true;

        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 200;
        bp.Q.value = 0.5;

        var nGain = ctx.createGain();
        nGain.gain.value = 0.025;

        noise.connect(bp);
        bp.connect(nGain);
        nGain.connect(droneGain);
        noise.start();
    }

    function setDroneIntensity(intensity) {
        if (!ready || !droneGain) return;
        var vol = CONFIG.audio.droneBase * (1 + intensity * 5);
        droneGain.gain.linearRampToValueAtTime(
            Math.min(vol, 0.4),
            ctx.currentTime + 1.2
        );
    }

    // --- WHISPERS ---
    function scheduleWhisper() {
        if (!ready) return;
        var delay = CONFIG.timing.whisperRange[0] +
            Math.random() * (CONFIG.timing.whisperRange[1] - CONFIG.timing.whisperRange[0]);
        setTimeout(function() {
            playWhisper();
            scheduleWhisper();
        }, delay);
    }

    function playWhisper() {
        if (!ready || document.hidden) return;

        var dur = 1.5 + Math.random() * 2.5;
        var now = ctx.currentTime;
        var len = Math.floor(ctx.sampleRate * dur);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = buf.getChannelData(0);

        // Amplitude-modulated noise with speech-like cadence
        for (var i = 0; i < len; i++) {
            var mod = Math.sin(i / ctx.sampleRate * Math.PI * (3 + Math.random() * 5));
            d[i] = (Math.random() * 2 - 1) * Math.max(0, mod) * 0.5;
        }

        var src = ctx.createBufferSource();
        src.buffer = buf;

        var filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 600 + Math.random() * 1600;
        filt.Q.value = 3;

        var g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(CONFIG.audio.whisperVolume, now + 0.2);
        g.gain.linearRampToValueAtTime(0, now + dur);

        var pan = ctx.createStereoPanner();
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
        beats = beats || 5;
        var now = ctx.currentTime;

        for (var i = 0; i < beats; i++) {
            var t = now + i * 0.78;

            // Lub
            var o1 = ctx.createOscillator();
            o1.type = 'sine';
            o1.frequency.setValueAtTime(60, t);
            o1.frequency.exponentialRampToValueAtTime(25, t + 0.15);
            var g1 = ctx.createGain();
            g1.gain.setValueAtTime(0, t);
            g1.gain.linearRampToValueAtTime(CONFIG.audio.heartbeatVolume, t + 0.015);
            g1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            o1.connect(g1);
            g1.connect(master);
            o1.start(t);
            o1.stop(t + 0.35);

            // Dub
            var o2 = ctx.createOscillator();
            o2.type = 'sine';
            o2.frequency.value = 35;
            var g2 = ctx.createGain();
            g2.gain.setValueAtTime(0, t + 0.18);
            g2.gain.linearRampToValueAtTime(CONFIG.audio.heartbeatVolume * 0.6, t + 0.2);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
            o2.connect(g2);
            g2.connect(master);
            o2.start(t + 0.16);
            o2.stop(t + 0.55);
        }

        // Pulse vignette with heartbeat
        var beat = 0;
        var pulse = setInterval(function() {
            if (beat >= beats) { clearInterval(pulse); return; }
            setVignetteIntensity(0.7);
            setTimeout(function() { setVignetteIntensity(CONFIG.visual.vignetteBase + scrollIntensity * 0.2); }, 350);
            beat++;
        }, 780);
    }

    // --- SHARP DISSONANT TONE ---
    function playSharpTone() {
        if (!ready) return;
        var now = ctx.currentTime;

        // Create two detuned oscillators for dissonance
        var freqs = [2000 + Math.random() * 2000, 2100 + Math.random() * 2500];
        for (var f = 0; f < freqs.length; f++) {
            var o = ctx.createOscillator();
            o.type = 'sawtooth';
            o.frequency.value = freqs[f];

            var hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 1500;

            var g = ctx.createGain();
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(CONFIG.audio.sharpVolume, now + 0.005);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            o.connect(hp);
            hp.connect(g);
            g.connect(master);
            o.start(now);
            o.stop(now + 0.65);
        }
    }

    // --- LOW RUMBLE ---
    function playRumble(duration) {
        if (!ready) return;
        duration = duration || 4;
        var now = ctx.currentTime;

        var o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = 22;

        var lfo2 = ctx.createOscillator();
        lfo2.type = 'sine';
        lfo2.frequency.value = 0.4;
        var lfoG = ctx.createGain();
        lfoG.gain.value = 10;
        lfo2.connect(lfoG);
        lfoG.connect(o.frequency);
        lfo2.start(now);

        var g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.15, now + duration * 0.25);
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
    var vignette = null;

    function createVignette() {
        vignette = document.createElement('div');
        vignette.id = 'horror-vignette';
        vignette.setAttribute('aria-hidden', 'true');
        document.body.appendChild(vignette);
        // Start with a visible base vignette immediately
        vignette.style.opacity = CONFIG.visual.vignetteBase;
    }

    function setVignetteIntensity(v) {
        if (!vignette) return;
        var val = Math.max(CONFIG.visual.vignetteBase, v);
        vignette.style.opacity = Math.min(val, CONFIG.visual.vignetteMax);
    }

    // --- SCREEN GLITCH ---
    function glitchEffect() {
        // Create visible scan-line overlay
        var ov = document.createElement('div');
        ov.className = 'horror-glitch-overlay';
        ov.setAttribute('aria-hidden', 'true');
        document.body.appendChild(ov);

        // Also shift the page content briefly
        var main = document.querySelector('main') || document.querySelector('.container');
        if (main) {
            var shift = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4);
            main.style.transition = 'none';
            main.style.transform = 'translateX(' + shift + 'px)';
            setTimeout(function() {
                main.style.transform = 'translateX(' + (-shift * 0.5) + 'px)';
                setTimeout(function() {
                    main.style.transition = 'transform 0.3s ease';
                    main.style.transform = '';
                }, 60);
            }, 80);
        }

        // Red tint flash
        var tint = document.createElement('div');
        tint.className = 'horror-red-tint';
        tint.setAttribute('aria-hidden', 'true');
        document.body.appendChild(tint);

        setTimeout(function() {
            ov.remove();
            tint.remove();
        }, CONFIG.visual.glitchDuration);
    }

    // --- TEXT SCRAMBLE (preserves HTML) ---
    var CHARS = '\u2588\u2593\u2592\u2591\u2580\u2584\u258C\u2590ABCDEFXYZabcdefxyz!@#$%&*01';

    function scrambleText(el) {
        if (el.dataset.scrambled) return;
        el.dataset.scrambled = '1';

        // Store original HTML and work with text nodes only
        var originalHTML = el.innerHTML;
        var textNodes = [];
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        var node;
        while (node = walker.nextNode()) {
            if (node.textContent.trim().length > 0) {
                textNodes.push({ node: node, original: node.textContent });
            }
        }

        if (textNodes.length === 0) return;

        var dur = CONFIG.visual.scrambleDuration;
        var t0 = performance.now();

        function tick(now) {
            var p = Math.min((now - t0) / dur, 1);
            for (var i = 0; i < textNodes.length; i++) {
                var tn = textNodes[i];
                var orig = tn.original;
                var out = '';
                for (var j = 0; j < orig.length; j++) {
                    if (orig[j] === ' ' || orig[j] === '\n') {
                        out += orig[j];
                    } else if (j / orig.length < p) {
                        out += orig[j];
                    } else {
                        out += CHARS[Math.floor(Math.random() * CHARS.length)];
                    }
                }
                tn.node.textContent = out;
            }
            if (p < 1) {
                requestAnimationFrame(tick);
            } else {
                // Restore originals
                for (var k = 0; k < textNodes.length; k++) {
                    textNodes[k].node.textContent = textNodes[k].original;
                }
            }
        }
        requestAnimationFrame(tick);
    }

    // --- SCREEN FLICKER ---
    function screenFlicker() {
        var count = CONFIG.visual.flickerCount;
        var i = 0;
        function flash() {
            if (i >= count) return;
            document.body.classList.add('horror-flicker');
            var dur = 40 + Math.random() * 60;
            setTimeout(function() {
                document.body.classList.remove('horror-flicker');
                i++;
                if (i < count) {
                    setTimeout(flash, 30 + Math.random() * 80);
                }
            }, dur);
        }
        flash();
    }

    // --- TEXT BLEED ---
    function textBleed(el) {
        el.classList.add('horror-text-bleed');
        setTimeout(function() { el.classList.remove('horror-text-bleed'); }, 4000);
    }

    // --- COLOR SHIFT (brief red/blue color wash) ---
    function colorShift() {
        var wash = document.createElement('div');
        wash.className = 'horror-color-wash';
        wash.setAttribute('aria-hidden', 'true');
        document.body.appendChild(wash);
        // Trigger animation
        requestAnimationFrame(function() { wash.style.opacity = '1'; });
        setTimeout(function() {
            wash.style.opacity = '0';
            setTimeout(function() { wash.remove(); }, 600);
        }, 400);
    }

    // =========================================================================
    // INTERACTIVE ELEMENTS
    // =========================================================================

    // --- WHISPER TEXT ---
    function setupWhisperText() {
        var whispers = document.querySelectorAll('.horror-whisper');
        for (var i = 0; i < whispers.length; i++) {
            (function(el) {
                el.addEventListener('mouseenter', function() {
                    el.classList.add('horror-whisper-visible');
                    if (ready) playWhisper();
                });
                el.addEventListener('mouseleave', function() {
                    el.classList.remove('horror-whisper-visible');
                });
            })(whispers[i]);
        }
    }

    // --- CURSOR TRAIL ---
    var cursorTrailOn = false;

    function setupCursorTrail() {
        if ('ontouchstart' in window) return;

        var lastX = 0, lastY = 0;
        document.addEventListener('mousemove', function(e) {
            if (!cursorTrailOn) return;
            var dx = e.clientX - lastX, dy = e.clientY - lastY;
            if (dx * dx + dy * dy < 80) return;
            lastX = e.clientX;
            lastY = e.clientY;

            var dot = document.createElement('div');
            dot.className = 'horror-cursor-dot';
            dot.style.left = e.clientX + 'px';
            dot.style.top = e.clientY + 'px';
            dot.setAttribute('aria-hidden', 'true');
            document.body.appendChild(dot);
            setTimeout(function() { dot.remove(); }, 1500);
        });
    }

    // --- HORROR TRIGGER ZONES ---
    function setupScrollTriggers() {
        var triggers = document.querySelectorAll('.horror-trigger');
        if (!triggers.length) return;

        var obs = new IntersectionObserver(function(entries) {
            for (var idx = 0; idx < entries.length; idx++) {
                var entry = entries[idx];
                if (!entry.isIntersecting) continue;

                var el = entry.target;
                // Allow re-firing for some effects, one-shot for others
                var fx = el.dataset.horror;
                if (!fx) continue;

                // One-shot effects: check if already fired
                var oneShot = (fx === 'scramble' || fx === 'intensify' || fx === 'calm');
                if (oneShot && el.dataset.horrorFired) continue;
                if (oneShot) el.dataset.horrorFired = '1';

                // Rate-limit re-firable effects
                if (!oneShot) {
                    var now = Date.now();
                    var lastFired = parseInt(el.dataset.horrorLast || '0', 10);
                    if (now - lastFired < 5000) continue; // 5 sec cooldown
                    el.dataset.horrorLast = String(now);
                }

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
                        pulseVignette(0.65, 4000);
                        break;
                    case 'flicker':
                        screenFlicker();
                        colorShift();
                        break;
                    case 'intensify':
                        setDroneIntensity(0.9);
                        cursorTrailOn = true;
                        setVignetteIntensity(0.5);
                        break;
                    case 'calm':
                        setDroneIntensity(0.1);
                        cursorTrailOn = false;
                        setVignetteIntensity(CONFIG.visual.vignetteBase);
                        break;
                    case 'whisper-burst':
                        if (ready) {
                            playWhisper();
                            setTimeout(playWhisper, 300);
                            setTimeout(playWhisper, 700);
                        }
                        pulseVignette(0.4, 2000);
                        break;
                    case 'rumble':
                        if (ready) playRumble(4);
                        glitchEffect();
                        pulseVignette(0.55, 4500);
                        break;
                    case 'bleed':
                        textBleed(el);
                        if (ready) playWhisper();
                        break;
                }
            }
        }, { threshold: 0.15 }); // lower threshold — fires sooner

        for (var t = 0; t < triggers.length; t++) {
            obs.observe(triggers[t]);
        }
    }

    // Helper: pulse vignette then return to base
    function pulseVignette(intensity, duration) {
        setVignetteIntensity(intensity);
        setTimeout(function() {
            setVignetteIntensity(CONFIG.visual.vignetteBase + scrollIntensity * 0.2);
        }, duration);
    }

    // --- RANDOM AMBIENT EVENTS ---
    function scheduleAmbientEvent() {
        var delay = CONFIG.timing.ambientRange[0] +
            Math.random() * (CONFIG.timing.ambientRange[1] - CONFIG.timing.ambientRange[0]);

        setTimeout(function() {
            if (!document.hidden) {
                var r = Math.random();
                if (r < 0.20) {
                    // Screen flicker
                    screenFlicker();
                } else if (r < 0.38) {
                    // Glitch
                    glitchEffect();
                } else if (r < 0.52) {
                    // Vignette pulse
                    pulseVignette(0.55, 1500);
                } else if (r < 0.65) {
                    // Color wash
                    colorShift();
                } else if (r < 0.80 && ready) {
                    // Whisper
                    playWhisper();
                } else if (r < 0.90) {
                    // Brief text shadow on a random paragraph
                    var ps = document.querySelectorAll('article p, .container p');
                    if (ps.length > 0) {
                        textBleed(ps[Math.floor(Math.random() * ps.length)]);
                    }
                }
                // 10% chance: nothing
            }
            scheduleAmbientEvent();
        }, delay);
    }

    // =========================================================================
    // SCROLL-BASED INTENSITY
    // =========================================================================
    var scrollIntensity = 0;

    function updateScrollIntensity() {
        var total = document.documentElement.scrollHeight - window.innerHeight;
        if (total <= 0) return;
        var pct = window.scrollY / total;
        scrollIntensity = Math.min(pct * 1.4, 1);
        setVignetteIntensity(CONFIG.visual.vignetteBase + scrollIntensity * 0.2);
        setDroneIntensity(scrollIntensity * 0.5);
    }

    var sTicking = false;
    window.addEventListener('scroll', function() {
        if (!sTicking) {
            requestAnimationFrame(function() { updateScrollIntensity(); sTicking = false; });
            sTicking = true;
        }
    }, { passive: true });

    // =========================================================================
    // AUDIO CLICK-TO-START OVERLAY
    // =========================================================================
    function createAudioPrompt() {
        var prompt = document.createElement('div');
        prompt.id = 'horror-audio-prompt';
        prompt.setAttribute('aria-label', 'Enable audio for immersive experience');
        prompt.innerHTML = '<div class="horror-audio-prompt-inner">' +
            '<div class="horror-audio-icon">&#9835;</div>' +
            '<div class="horror-audio-text">Click anywhere for the full experience</div>' +
            '<div class="horror-audio-sub">Audio enhances this story</div>' +
            '</div>';
        document.body.appendChild(prompt);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() { prompt.style.opacity = '1'; });
        });

        function dismiss() {
            initAudio();
            prompt.style.opacity = '0';
            setTimeout(function() { if (prompt.parentNode) prompt.remove(); }, 800);
            document.removeEventListener('click', dismiss);
            document.removeEventListener('keydown', dismiss);
            document.removeEventListener('touchstart', dismiss);
        }

        document.addEventListener('click', dismiss);
        document.addEventListener('keydown', dismiss);
        document.addEventListener('touchstart', dismiss);

        // Also init audio on scroll
        document.addEventListener('scroll', function scrollInit() {
            initAudio();
            document.removeEventListener('scroll', scrollInit);
        });

        // Auto-dismiss prompt after 10 seconds
        setTimeout(function() {
            if (prompt.parentNode) {
                prompt.style.opacity = '0';
                setTimeout(function() { if (prompt.parentNode) prompt.remove(); }, 800);
            }
        }, 10000);
    }

    // =========================================================================
    // ON-LOAD EFFECTS — immediate visual impact
    // =========================================================================
    function onLoadEffects() {
        // Brief vignette surge
        setVignetteIntensity(0.45);
        setTimeout(function() {
            setVignetteIntensity(CONFIG.visual.vignetteBase);
        }, 2000);

        // Delayed first flicker
        setTimeout(function() {
            screenFlicker();
        }, CONFIG.timing.onLoadDelay);

        // Delayed glitch
        setTimeout(function() {
            glitchEffect();
        }, CONFIG.timing.onLoadDelay + 3000);
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    function init() {
        createVignette();
        setupWhisperText();
        setupCursorTrail();
        setupScrollTriggers();
        scheduleAmbientEvent();
        onLoadEffects();

        // Show audio prompt after short delay
        setTimeout(createAudioPrompt, 1200);
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
        colorShift: colorShift,
        setDroneIntensity: setDroneIntensity,
        setVignetteIntensity: setVignetteIntensity,
        enableTrail: function () { cursorTrailOn = true; },
        disableTrail: function () { cursorTrailOn = false; },
    };

})();
