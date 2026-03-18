/**
 * Horror Effects Engine for "The Void at Crimson Sunset"
 *
 * Enhanced audio engine with dissonant cluster chords, metal scrapes,
 * reverse swells, binaural beating, impact hits, and breath sounds.
 * Smoother visual effects with chromatic aberration, screen breathing,
 * and film grain.
 *
 * Usage: Include this script on any page. Add CSS classes to elements:
 *   .horror-trigger[data-horror="scramble|glitch|heartbeat|flicker|intensify|calm|whisper-burst|rumble|bleed|impact|screech"]
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
            masterVolume: 0.35,      // Increased from 0.18
            droneBase: 0.12,         // Increased from 0.05
            whisperVolume: 0.15,     // Increased from 0.04
            heartbeatVolume: 0.25,   // Increased from 0.12
            sharpVolume: 0.15,       // Increased from 0.06
            stingerVolume: 0.25,     // Increased from 0.10
            impactVolume: 0.35,      // Increased from 0.15
            scrapeVolume: 0.12,      // Increased from 0.04
            breathVolume: 0.10,      // Increased from 0.03
            binauralVolume: 0.08,    // Increased from 0.02
        },
        visual: {
            glitchDuration: 300,
            scrambleDuration: 1000,
            vignetteBase: 0.12,
            vignetteMax: 0.70,
            flickerCount: 3,
            breathingEnabled: false,
            grainEnabled: true,
            chromaticEnabled: true,
        },
        timing: {
            whisperRange: [25000, 60000], // Slower, more rare
            ambientRange: [30000, 80000], // Slower, more rare
            onLoadDelay: 6000,
            breathCycle: 12000,
        },
    };    // =========================================================================
    // AUDIO ENGINE
    // =========================================================================
    var ctx = null;
    var master = null;
    var reverbNode = null;
    var ready = false;
    var droneGain = null;
    var droneNodes = [];
    var tension = 0; // 0 to 1 scale for audio intensity

    function initAudio() {
        if (ready) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            master = ctx.createGain();
            master.gain.value = CONFIG.audio.masterVolume;
            master.connect(ctx.destination);
            
            // --- SPATIAL REVERB BUS (Creates a vast, cavernous environment) ---
            reverbNode = ctx.createGain();
            reverbNode.gain.value = 0.6; // Wet send level
            
            var delayL = ctx.createDelay(); delayL.delayTime.value = 0.27;
            var delayR = ctx.createDelay(); delayR.delayTime.value = 0.37;
            var fbL = ctx.createGain(); fbL.gain.value = 0.45;
            var fbR = ctx.createGain(); fbR.gain.value = 0.45;
            var crossL = ctx.createGain(); crossL.gain.value = 0.25;
            var crossR = ctx.createGain(); crossR.gain.value = 0.25;
            
            var damp = ctx.createBiquadFilter(); 
            damp.type = 'lowpass'; 
            damp.frequency.value = 2500;

            reverbNode.connect(damp);
            damp.connect(delayL);
            damp.connect(delayR);

            delayL.connect(fbL); fbL.connect(delayL);
            delayR.connect(fbR); fbR.connect(delayR);
            delayL.connect(crossL); crossL.connect(delayR);
            delayR.connect(crossR); crossR.connect(delayL);

            var panL = ctx.createStereoPanner(); panL.pan.value = -0.8;
            var panR = ctx.createStereoPanner(); panR.pan.value = 0.8;

            delayL.connect(panL); panL.connect(master);
            delayR.connect(panR); panR.connect(master);

            function startAll() {
                ready = true;
                startDrone();
                scheduleWhisper();
                scheduleBreath();
                updateTensionLoop();
            }

            if (ctx.state === 'suspended') {
                ctx.resume().then(startAll).catch(function() { startAll(); });
            } else {
                startAll();
            }
        } catch (e) {
            console.warn('Horror audio unavailable:', e);
        }
    }

    // --- ALEATORIC DISSONANT DRONE ---
    var droneActive = false;
    function startDrone() {
        if (!ready || droneActive) return;
        droneActive = true;

        droneGain = ctx.createGain();
        droneGain.gain.value = 0;
        droneGain.connect(master);
        droneGain.connect(reverbNode); // Send to cavern
        droneGain.gain.linearRampToValueAtTime(CONFIG.audio.droneBase, ctx.currentTime + 3);

        // Sub-bass foundation (The "Void" hum) - headphones only
        createDroneLayer(42, 'sine', 0.4, 0.03, 2);

        // Background Dissonance: Aleatoric Cluster (Smoother waves)
        createDroneLayer(44.5, 'triangle', 0.15, 0.05, 1.5);
        createDroneLayer(59.5, 'sine', 0.12, 0.02, 1);
        createDroneLayer(89, 'triangle', 0.04, 0.08, 0.5);

        // Mid-range presence (audible on phone speakers)
        createDroneLayer(220, 'sine', 0.06, 0.04, 3);
        createDroneLayer(330, 'triangle', 0.03, 0.02, 2);

        // High ghost tones (The "Crimson" shimmer)
        createDroneLayer(15500, 'sine', 0.01, 0.01, 0.1);
        createDroneLayer(15523, 'sine', 0.008, 0.012, 0.08);

        // Filtered noise (The "Wind of the Void")
        var bufLen = ctx.sampleRate * 4;
        var noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        var nd = noiseBuf.getChannelData(0);
        for (var i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;

        var noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        noise.loop = true;

        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 300;
        bp.Q.value = 0.3; // Wider band centered higher for phone audibility

        var noiseLfo = ctx.createOscillator();
        noiseLfo.type = 'sine';
        noiseLfo.frequency.value = 0.015;
        var noiseLfoAmt = ctx.createGain();
        noiseLfoAmt.gain.value = 80;
        noiseLfo.connect(noiseLfoAmt);
        noiseLfoAmt.connect(bp.frequency);
        noiseLfo.start();
        droneNodes.push(noiseLfo);

        var nGain = ctx.createGain();
        nGain.gain.value = 0.06;

        noise.connect(bp);
        bp.connect(nGain);
        nGain.connect(droneGain);
        noise.start();
        droneNodes.push(noise);

        startBinauralBeat();
    }

    function createDroneLayer(freq, type, vol, lfoFreq, lfoDepth) {
        var osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        
        var g = ctx.createGain();
        g.gain.value = vol;
        
        // Add subtle FM modulation for organic instability
        var mod = ctx.createOscillator();
        mod.type = 'sine';
        mod.frequency.value = freq * 0.5;
        var modG = ctx.createGain();
        modG.gain.value = freq * 0.02;
        mod.connect(modG);
        modG.connect(osc.frequency);
        mod.start();

        var lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = lfoFreq;
        var lfoAmt = ctx.createGain();
        lfoAmt.gain.value = lfoDepth;
        
        lfo.connect(lfoAmt);
        lfoAmt.connect(osc.frequency);
        
        osc.connect(g);
        g.connect(droneGain);
        
        osc.start();
        lfo.start();
        droneNodes.push(osc, lfo, mod);
    }

    function updateTensionLoop() {
        if (!ready) return;
        // Decay tension gradually so it doesn't stay maxed forever
        tension *= 0.97;
        if (tension < 0.01) tension = 0;
        var now = ctx.currentTime;
        var targetVol = Math.min(CONFIG.audio.droneBase * (1 + tension * 3), 0.4);
        droneGain.gain.linearRampToValueAtTime(targetVol, now + 0.5);
        setTimeout(updateTensionLoop, 500);
    }

    // --- BINAURAL BEATING ---
    function startBinauralBeat() {
        if (!ready) return;
        var binGain = ctx.createGain();
        binGain.gain.value = CONFIG.audio.binauralVolume;
        binGain.connect(droneGain);

        var oscL = ctx.createOscillator(); oscL.type = 'sine'; oscL.frequency.value = 90;
        var panL = ctx.createStereoPanner(); panL.pan.value = -1;
        oscL.connect(panL); panL.connect(binGain); oscL.start();
        droneNodes.push(oscL);

        var oscR = ctx.createOscillator(); oscR.type = 'sine'; oscR.frequency.value = 96.5; 
        var panR = ctx.createStereoPanner(); panR.pan.value = 1;
        oscR.connect(panR); panR.connect(binGain); oscR.start();
        droneNodes.push(oscR);
    }

    function setDroneIntensity(intensity, force) {
        if (force) {
            tension = Math.min(intensity, 1.0);
        } else {
            tension = Math.max(tension, Math.min(intensity, 1.0));
        }
    }

    // --- ENHANCED WHISPERS ---
    function scheduleWhisper() {
        if (!ready) return;
        var delay = CONFIG.timing.whisperRange[0] +
            Math.random() * (CONFIG.timing.whisperRange[1] - CONFIG.timing.whisperRange[0]);
        setTimeout(function () {
            playWhisper();
            scheduleWhisper();
        }, delay);
    }

    function playWhisper() {
        if (!ready || document.hidden) return;
        var dur = 2.0 + Math.random() * 3.5;
        var now = ctx.currentTime;
        var len = Math.floor(ctx.sampleRate * dur);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = buf.getChannelData(0);

        var formantFreq = 2 + Math.random() * 5;
        var secondFormant = 0.3 + Math.random() * 0.4;
        for (var i = 0; i < len; i++) {
            var t = i / ctx.sampleRate;
            var mod1 = Math.sin(t * Math.PI * formantFreq);
            var mod2 = Math.sin(t * Math.PI * formantFreq * secondFormant);
            var env = Math.max(0, mod1) * (0.5 + 0.5 * mod2);
            d[i] = (Math.random() * 2 - 1) * env * 0.5;
        }

        var src = ctx.createBufferSource();
        src.buffer = buf;

        // Comb filtering to make the whisper sound like a throat
        var throatDelay = ctx.createDelay();
        throatDelay.delayTime.value = 0.002 + Math.random() * 0.003;
        var throatFb = ctx.createGain();
        throatFb.gain.value = 0.5;
        throatDelay.connect(throatFb); throatFb.connect(throatDelay);
        src.connect(throatDelay);

        var filt1 = ctx.createBiquadFilter(); filt1.type = 'bandpass'; filt1.frequency.value = 600 + Math.random() * 800; filt1.Q.value = 2;
        var filt2 = ctx.createBiquadFilter(); filt2.type = 'highpass'; filt2.frequency.value = 2000;

        var g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(CONFIG.audio.whisperVolume, now + 0.2);
        g.gain.setValueAtTime(CONFIG.audio.whisperVolume, now + dur * 0.7);
        g.gain.linearRampToValueAtTime(0, now + dur);

        var pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.5;
        pan.pan.linearRampToValueAtTime((Math.random() - 0.5) * 1.5, now + dur);

        throatDelay.connect(filt1);
        filt1.connect(filt2);
        filt2.connect(g);
        g.connect(pan);
        pan.connect(master);
        pan.connect(reverbNode); // Wet sound

        src.start(now);
        src.stop(now + dur);
    }

    // --- ENHANCED HEARTBEAT ---
    function playHeartbeat(beats) {
        if (!ready) return;
        beats = beats || 6;
        var now = ctx.currentTime;

        for (var i = 0; i < beats; i++) {
            var t = now + i * 0.75;

            // Lub - Physical thud (Sine sweep + soft noise)
            var o1 = ctx.createOscillator();
            o1.type = 'sine';
            o1.frequency.setValueAtTime(80, t);
            o1.frequency.exponentialRampToValueAtTime(20, t + 0.15);
            var g1 = ctx.createGain();
            g1.gain.setValueAtTime(0, t);
            g1.gain.linearRampToValueAtTime(CONFIG.audio.heartbeatVolume, t + 0.02);
            g1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            
            var shaper = ctx.createWaveShaper();
            shaper.curve = new Float32Array([-0.8, 0, 0.8]);
            o1.connect(shaper); shaper.connect(g1); g1.connect(master);
            o1.start(t); o1.stop(t + 0.35);

            // Dub - Heavier follow up
            var o2 = ctx.createOscillator();
            o2.type = 'sine';
            o2.frequency.setValueAtTime(60, t + 0.2);
            o2.frequency.exponentialRampToValueAtTime(15, t + 0.4);
            var g2 = ctx.createGain();
            g2.gain.setValueAtTime(0, t + 0.18);
            g2.gain.linearRampToValueAtTime(CONFIG.audio.heartbeatVolume * 0.8, t + 0.22);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            o2.connect(g2); g2.connect(master);
            o2.start(t + 0.18); o2.stop(t + 0.55);
        }

        var beat = 0;
        var pulse = setInterval(function () {
            if (beat >= beats) { clearInterval(pulse); return; }
            setVignetteIntensity(0.72);
            if(window.HorrorEngine.chromaticPulse) window.HorrorEngine.chromaticPulse(250);
            setTimeout(function () { setVignetteIntensity(CONFIG.visual.vignetteBase + scrollIntensity * 0.2); }, 350);
            beat++;
        }, 750);
    }

    // --- ORGANIC SHARP STINGER (FM Synthesis) ---
    function playSharpTone() {
        if (!ready) return;
        var now = ctx.currentTime;
        var dur = 0.8;

        var carrier = ctx.createOscillator();
        carrier.type = 'triangle';
        carrier.frequency.value = 800 + Math.random() * 400;

        var modulator = ctx.createOscillator();
        modulator.type = 'square';
        modulator.frequency.value = carrier.frequency.value * (1.5 + Math.random() * 0.5); 
        
        var modGain = ctx.createGain();
        modGain.gain.setValueAtTime(2000, now);
        modGain.gain.exponentialRampToValueAtTime(10, now + dur);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        var filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(4000, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + dur);
        filter.Q.value = 5;

        var g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(CONFIG.audio.stingerVolume * 1.2, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);

        carrier.connect(filter);
        filter.connect(g);
        g.connect(master);
        g.connect(reverbNode);

        carrier.start(now);
        modulator.start(now);
        carrier.stop(now + dur);
        modulator.stop(now + dur);
    }

    // --- METAL SCRAPE (Comb Filtering) ---
    function playMetalScrape() {
        if (!ready) return;
        var now = ctx.currentTime;
        var dur = 2.0 + Math.random() * 1.5;

        var len = Math.floor(ctx.sampleRate * dur);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

        var src = ctx.createBufferSource();
        src.buffer = buf;

        var combDelay = ctx.createDelay();
        combDelay.delayTime.setValueAtTime(0.003, now); 
        combDelay.delayTime.exponentialRampToValueAtTime(0.015, now + dur); 
        
        var combFb = ctx.createGain();
        combFb.gain.value = 0.96; 
        
        var damp = ctx.createBiquadFilter();
        damp.type = 'lowpass';
        damp.frequency.value = 4000;

        src.connect(combDelay);
        combDelay.connect(damp);
        damp.connect(combFb);
        combFb.connect(combDelay);

        var g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(CONFIG.audio.scrapeVolume, now + 0.1);
        g.gain.setValueAtTime(CONFIG.audio.scrapeVolume, now + dur * 0.7);
        g.gain.linearRampToValueAtTime(0, now + dur);

        var pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.5;

        combDelay.connect(g);
        g.connect(pan);
        pan.connect(master);
        pan.connect(reverbNode);

        src.start(now);
        src.stop(now + dur);
    }

    // --- REVERSE SWELL (Cavernous FM) ---
    function playReverseSwell() {
        if (!ready) return;
        var now = ctx.currentTime;
        var dur = 2.5 + Math.random() * 1.5;

        var baseFreq = 80 + Math.random() * 40;
        
        var osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = baseFreq;

        var mod = ctx.createOscillator();
        mod.type = 'sine';
        mod.frequency.value = baseFreq * 2.14;
        var modG = ctx.createGain();
        modG.gain.setValueAtTime(0, now);
        modG.gain.exponentialRampToValueAtTime(400, now + dur - 0.1);
        mod.connect(modG);
        modG.connect(osc.frequency);

        var swellGain = ctx.createGain();
        swellGain.gain.setValueAtTime(0.001, now);
        swellGain.gain.exponentialRampToValueAtTime(CONFIG.audio.sharpVolume * 1.5, now + dur - 0.05);
        swellGain.gain.setValueAtTime(0, now + dur);

        var lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(100, now);
        lp.frequency.exponentialRampToValueAtTime(6000, now + dur - 0.1);

        osc.connect(swellGain);
        swellGain.connect(lp);
        lp.connect(master);
        lp.connect(reverbNode);

        osc.start(now); mod.start(now);
        osc.stop(now + dur); mod.stop(now + dur);
    }

    // --- IMPACT HIT (Deep room boom) ---
    function playImpact() {
        if (!ready) return;
        var now = ctx.currentTime;

        var o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(120, now);
        o.frequency.exponentialRampToValueAtTime(10, now + 0.4);

        var g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(CONFIG.audio.impactVolume, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        var shaper = ctx.createWaveShaper();
        shaper.curve = new Float32Array([-0.5, 0, 0.5]); 

        o.connect(shaper); shaper.connect(g); g.connect(master); g.connect(reverbNode);
        o.start(now); o.stop(now + 1.2);

        var nLen = Math.floor(ctx.sampleRate * 0.15);
        var nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
        var nD = nBuf.getChannelData(0);
        for (var i = 0; i < nLen; i++) nD[i] = Math.random() * 2 - 1;

        var nSrc = ctx.createBufferSource();
        nSrc.buffer = nBuf;
        var nG = ctx.createGain();
        nG.gain.setValueAtTime(CONFIG.audio.impactVolume * 0.8, now);
        nG.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        var nLP = ctx.createBiquadFilter();
        nLP.type = 'lowpass'; nLP.frequency.value = 400;

        nSrc.connect(nLP); nLP.connect(nG); nG.connect(master); nG.connect(reverbNode);
        nSrc.start(now); nSrc.stop(now + 0.15);
    }

    // --- LOW RUMBLE ---
    function playRumble(duration) {
        if (!ready) return;
        duration = duration || 4;
        var now = ctx.currentTime;

        var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 25;
        var lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.5;
        var lfoG = ctx.createGain(); lfoG.gain.value = 10;
        lfo.connect(lfoG); lfoG.connect(o.frequency); lfo.start(now); lfo.stop(now + duration);

        var o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 35;
        
        var g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.25, now + duration * 0.3);
        g.gain.setValueAtTime(0.25, now + duration * 0.7);
        g.gain.linearRampToValueAtTime(0, now + duration);

        o.connect(g); o2.connect(g);
        g.connect(master);
        g.connect(reverbNode);
        
        o.start(now); o2.start(now);
        o.stop(now + duration); o2.stop(now + duration);
    }

    // --- SUDDEN SILENCE ---
    function playSuddenSilence() {
        if (!ready || !master) return;
        var now = ctx.currentTime;
        droneNodes.forEach(function(node) { try { node.stop(now); } catch(e) {} });
        droneNodes = [];
        droneActive = false;
        tension = 0;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 0.01);

        setTimeout(function() {
            master.gain.linearRampToValueAtTime(CONFIG.audio.masterVolume, ctx.currentTime + 2);
            startDrone();
        }, 3000 + Math.random() * 2000);
    }

    // --- BREATH SOUNDS ---
    function scheduleBreath() {
        if (!ready) return;
        var delay = 15000 + Math.random() * 25000;
        setTimeout(function () { playBreath(); scheduleBreath(); }, delay);
    }

    function playBreath() {
        if (!ready || document.hidden) return;
        var now = ctx.currentTime;
        var dur = 2.5 + Math.random() * 2;
        var len = Math.floor(ctx.sampleRate * dur);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = buf.getChannelData(0);

        for (var i = 0; i < len; i++) {
            var t = i / len;
            var env;
            if (t < 0.4) env = Math.sin(t / 0.4 * Math.PI * 0.5);
            else if (t < 0.5) env = Math.cos((t - 0.4) / 0.1 * Math.PI * 0.5) * 0.2;
            else env = Math.sin((t - 0.5) / 0.5 * Math.PI) * 0.8;
            d[i] = (Math.random() * 2 - 1) * env;
        }

        var src = ctx.createBufferSource(); src.buffer = buf;

        var throatDelay = ctx.createDelay();
        throatDelay.delayTime.value = 0.005;
        var throatFb = ctx.createGain(); throatFb.gain.value = 0.45;
        throatDelay.connect(throatFb); throatFb.connect(throatDelay);
        src.connect(throatDelay);

        var f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 350; f1.Q.value = 1.2;
        var f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1100; f2.Q.value = 2;

        var g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(CONFIG.audio.breathVolume, now + 0.3);
        g.gain.setValueAtTime(CONFIG.audio.breathVolume, now + dur * 0.8);
        g.gain.linearRampToValueAtTime(0, now + dur);

        var pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.5;

        throatDelay.connect(f1); throatDelay.connect(f2);
        f1.connect(g); f2.connect(g);
        g.connect(pan);
        pan.connect(master);
        pan.connect(reverbNode); 
        
        src.start(now); src.stop(now + dur);
    }

    // --- DISSONANT STRING CHORD ---
    function playDissonantChord() {
        if (!ready) return;
        var now = ctx.currentTime;
        var dur = 4 + Math.random() * 3;

        var base = 150 + Math.random() * 100;
        var intervals = [1, 1.059, 1.414, 1.887]; 
        var chordGain = ctx.createGain();
        chordGain.gain.setValueAtTime(0, now);
        chordGain.gain.linearRampToValueAtTime(CONFIG.audio.sharpVolume, now + 1.2);
        chordGain.gain.setValueAtTime(CONFIG.audio.sharpVolume, now + dur * 0.6);
        chordGain.gain.linearRampToValueAtTime(0, now + dur);

        for (var i = 0; i < intervals.length; i++) {
            var o = ctx.createOscillator();
            o.type = 'triangle'; 
            o.frequency.value = base * intervals[i];
            
            var vib = ctx.createOscillator(); vib.type = 'sine'; vib.frequency.value = 3 + Math.random() * 2;
            var vibG = ctx.createGain(); vibG.gain.value = base * intervals[i] * 0.01;
            vib.connect(vibG); vibG.connect(o.frequency);
            vib.start(now); vib.stop(now + dur);

            var oG = ctx.createGain(); oG.gain.value = 0.25;
            o.connect(oG); oG.connect(chordGain);
            o.start(now); o.stop(now + dur);
        }

        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
        var pan = ctx.createStereoPanner(); pan.pan.value = (Math.random() - 0.5) * 1.2;

        chordGain.connect(lp); lp.connect(pan);
        pan.connect(master);
        pan.connect(reverbNode); 
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
        vignette.style.opacity = CONFIG.visual.vignetteBase;
    }

    function setVignetteIntensity(v) {
        if (!vignette) return;
        var val = Math.max(CONFIG.visual.vignetteBase, v);
        vignette.style.opacity = Math.min(val, CONFIG.visual.vignetteMax);
    }

    // --- SCREEN BREATHING (subtle scale oscillation) ---
    var breathingActive = false;

    function startScreenBreathing() {
        if (!CONFIG.visual.breathingEnabled || breathingActive) return;
        breathingActive = true;
        var main = document.querySelector('main') || document.querySelector('.container');
        if (!main) return;

        var startTime = performance.now();
        function breathe(now) {
            if (!breathingActive) return;
            var elapsed = now - startTime;
            var cycle = (elapsed % CONFIG.timing.breathCycle) / CONFIG.timing.breathCycle;
            var scale = 1 + Math.sin(cycle * Math.PI * 2) * 0.002;
            var translateY = Math.sin(cycle * Math.PI * 2) * 0.3;
            main.style.transform = 'scale(' + scale + ') translateY(' + translateY + 'px)';
            requestAnimationFrame(breathe);
        }
        requestAnimationFrame(breathe);
    }

    // --- FILM GRAIN ---
    var grainCanvas = null;

    function createFilmGrain() {
        if (!CONFIG.visual.grainEnabled) return;
        grainCanvas = document.createElement('canvas');
        grainCanvas.id = 'horror-grain';
        grainCanvas.setAttribute('aria-hidden', 'true');
        grainCanvas.width = 256;
        grainCanvas.height = 256;
        document.body.appendChild(grainCanvas);

        var grainCtx = grainCanvas.getContext('2d');
        function renderGrain() {
            if (!document.hidden) {
                var imageData = grainCtx.createImageData(256, 256);
                var data = imageData.data;
                for (var i = 0; i < data.length; i += 4) {
                    var v = Math.random() * 255;
                    data[i] = v;
                    data[i + 1] = v;
                    data[i + 2] = v;
                    data[i + 3] = 12; // very subtle
                }
                grainCtx.putImageData(imageData, 0, 0);
            }
            requestAnimationFrame(renderGrain);
        }
        requestAnimationFrame(renderGrain);
    }

    // --- CHROMATIC ABERRATION PULSE ---
    function chromaticPulse(duration) {
        if (!CONFIG.visual.chromaticEnabled) return;
        duration = duration || 300;
        var overlay = document.createElement('div');
        overlay.className = 'horror-chromatic';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);
        setTimeout(function () {
            overlay.classList.add('horror-chromatic-active');
        }, 10);
        setTimeout(function () {
            overlay.classList.remove('horror-chromatic-active');
            setTimeout(function () { overlay.remove(); }, 400);
        }, duration);
    }

    // --- SCREEN GLITCH (enhanced with chromatic) ---
    function glitchEffect() {
        // Scan-line overlay
        var ov = document.createElement('div');
        ov.className = 'horror-glitch-overlay';
        ov.setAttribute('aria-hidden', 'true');
        document.body.appendChild(ov);

        // Content shift
        var main = document.querySelector('main') || document.querySelector('.container');
        if (main) {
            var shift = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 2);
            main.style.transition = 'none';
            main.style.transform = 'translateX(' + shift + 'px)';
            setTimeout(function () {
                main.style.transform = 'translateX(' + (-shift * 0.5) + 'px)';
                setTimeout(function () {
                    main.style.transition = 'transform 0.4s ease';
                    main.style.transform = '';
                }, 60);
            }, 80);
        }

        // Red tint flash
        var tint = document.createElement('div');
        tint.className = 'horror-red-tint';
        tint.setAttribute('aria-hidden', 'true');
        document.body.appendChild(tint);

        // Chromatic aberration
        chromaticPulse(250);

        setTimeout(function () {
            ov.remove();
            tint.remove();
        }, CONFIG.visual.glitchDuration);
    }

    // --- TEXT SCRAMBLE (preserves HTML) ---
    var CHARS = '\u2588\u2593\u2592\u2591\u2580\u2584\u258C\u2590ABCDEFXYZabcdefxyz!@#$%&*01';

    function scrambleText(el) {
        if (el.dataset.scrambled) return;
        el.dataset.scrambled = '1';

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
            var dur = 35 + Math.random() * 55;
            setTimeout(function () {
                document.body.classList.remove('horror-flicker');
                i++;
                if (i < count) {
                    setTimeout(flash, 25 + Math.random() * 70);
                }
            }, dur);
        }
        flash();
    }

    // --- TEXT BLEED ---
    function textBleed(el) {
        el.classList.add('horror-text-bleed');
        setTimeout(function () { el.classList.remove('horror-text-bleed'); }, 4000);
    }

    // --- COLOR SHIFT (brief red/blue color wash) ---
    function colorShift() {
        var wash = document.createElement('div');
        wash.className = 'horror-color-wash';
        wash.setAttribute('aria-hidden', 'true');
        document.body.appendChild(wash);
        requestAnimationFrame(function () { wash.style.opacity = '1'; });
        setTimeout(function () {
            wash.style.opacity = '0';
            setTimeout(function () { wash.remove(); }, 600);
        }, 400);
    }

    // =========================================================================
    // INTERACTIVE ELEMENTS
    // =========================================================================

    // --- WHISPER TEXT ---
    function setupWhisperText() {
        var whispers = document.querySelectorAll('.horror-whisper');
        for (var i = 0; i < whispers.length; i++) {
            (function (el) {
                el.addEventListener('mouseenter', function () {
                    el.classList.add('horror-whisper-visible');
                    if (ready) playWhisper();
                });
                el.addEventListener('mouseleave', function () {
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
        document.addEventListener('mousemove', function (e) {
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
            setTimeout(function () { dot.remove(); }, 1500);
        });
    }

    // --- HORROR TRIGGER ZONES ---
    function setupScrollTriggers() {
        var triggers = document.querySelectorAll('.horror-trigger');
        if (!triggers.length) return;

        var obs = new IntersectionObserver(function (entries) {
            for (var idx = 0; idx < entries.length; idx++) {
                var entry = entries[idx];
                if (!entry.isIntersecting) continue;

                var el = entry.target;
                var fx = el.dataset.horror;
                if (!fx) continue;

                // One-shot effects
                var oneShot = (fx === 'scramble' || fx === 'intensify' || fx === 'calm');
                if (oneShot && el.dataset.horrorFired) continue;
                if (oneShot) el.dataset.horrorFired = '1';

                // Rate-limit re-firable effects
                if (!oneShot) {
                    var now = Date.now();
                    var lastFired = parseInt(el.dataset.horrorLast || '0', 10);
                    if (now - lastFired < 5000) continue;
                    el.dataset.horrorLast = String(now);
                }

                switch (fx) {
                    case 'scramble':
                        scrambleText(el);
                        if (ready) playReverseSwell();
                        break;
                    case 'glitch':
                        if (ready) playSharpTone();
                        setTimeout(glitchEffect, 150); // 150ms delay to let audio lead
                        break;
                    case 'heartbeat':
                        if (ready) playHeartbeat();
                        pulseVignette(0.68, 4500);
                        break;
                    case 'flicker':
                        screenFlicker();
                        colorShift();
                        if (ready) playDissonantChord();
                        break;
                    case 'intensify':
                        setDroneIntensity(0.9);
                        cursorTrailOn = true;
                        setVignetteIntensity(0.5);
                        if (ready) playReverseSwell();
                        break;
                    case 'calm':
                        setDroneIntensity(0.1, true);
                        cursorTrailOn = false;
                        setVignetteIntensity(CONFIG.visual.vignetteBase);
                        break;
                    case 'whisper-burst':
                        if (ready) {
                            playWhisper();
                            setTimeout(playWhisper, 200);
                            setTimeout(playWhisper, 500);
                            setTimeout(playBreath, 800);
                        }
                        pulseVignette(0.45, 2000);
                        chromaticPulse(400);
                        break;
                    case 'rumble':
                        if (ready) {
                            playRumble(5);
                            playImpact();
                        }
                        setTimeout(function() {
                            glitchEffect();
                            pulseVignette(0.6, 5000);
                        }, 300); // 300ms delay for deep rumble to be felt first
                        break;
                    case 'bleed':
                        textBleed(el);
                        if (ready) {
                            playWhisper();
                            playDissonantChord();
                        }
                        chromaticPulse(600);
                        break;
                    case 'impact':
                        if (ready) playImpact();
                        screenFlicker();
                        chromaticPulse(200);
                        break;
                    case 'screech':
                        if (ready) playMetalScrape();
                        glitchEffect();
                        pulseVignette(0.55, 3000);
                        break;
                }
            }
        }, { threshold: 0.15 });

        for (var t = 0; t < triggers.length; t++) {
            obs.observe(triggers[t]);
        }
    }

    // Helper: pulse vignette then return to base
    function pulseVignette(intensity, duration) {
        setVignetteIntensity(intensity);
        setTimeout(function () {
            setVignetteIntensity(CONFIG.visual.vignetteBase + scrollIntensity * 0.2);
        }, duration);
    }

    // --- RANDOM AMBIENT EVENTS (more varied and frequent) ---
    function scheduleAmbientEvent() {
        var delay = CONFIG.timing.ambientRange[0] +
            Math.random() * (CONFIG.timing.ambientRange[1] - CONFIG.timing.ambientRange[0]);

        setTimeout(function () {
            if (!document.hidden) {
                var r = Math.random();
                // Substantially increased "nothing" chance for pacing
                if (r < 0.40) {
                    // 40% chance: nothing
                } else if (r < 0.46) {
                    screenFlicker();
                } else if (r < 0.52) {
                    glitchEffect();
                } else if (r < 0.58) {
                    pulseVignette(0.45, 1200);
                } else if (r < 0.64) {
                    colorShift();
                } else if (r < 0.72 && ready) {
                    playWhisper();
                } else if (r < 0.78 && ready) {
                    playMetalScrape();
                } else if (r < 0.84 && ready) {
                    playBreath();
                } else if (r < 0.90 && ready) {
                    playDissonantChord();
                } else if (r < 0.94) {
                    chromaticPulse(300);
                } else {
                    var ps = document.querySelectorAll('article p, .container p');
                    if (ps.length > 0) {
                        textBleed(ps[Math.floor(Math.random() * ps.length)]);
                    }
                }
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
        // Adjust animation durations based on intensity
        CONFIG.visual.glitchDuration = 300 / (1 + scrollIntensity);
        CONFIG.visual.scrambleDuration = 1000 / (1 + scrollIntensity);
    }

    // --- READING PROGRESS BAR ---
    var progressBar = null;
    function updateProgressBar() {
        if (!progressBar) progressBar = document.getElementById('progress-bar');
        if (!progressBar) return;
        var total = document.documentElement.scrollHeight - window.innerHeight;
        if (total <= 0) { progressBar.style.width = '0%'; return; }
        var pct = Math.min((window.scrollY / total) * 100, 100);
        progressBar.style.width = pct + '%';
    }

    var sTicking = false;
    window.addEventListener('scroll', function () {
        if (!sTicking) {
            requestAnimationFrame(function () {
                updateScrollIntensity();
                updateProgressBar();
                sTicking = false;
            });
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
            '<div class="horror-audio-sub">Headphones recommended</div>' +
            '</div>';
        document.body.appendChild(prompt);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () { prompt.style.opacity = '1'; });
        });

        function dismiss() {
            initAudio();
            prompt.style.opacity = '0';
            setTimeout(function () { if (prompt.parentNode) prompt.remove(); }, 800);
            document.removeEventListener('click', dismiss);
            document.removeEventListener('keydown', dismiss);
            document.removeEventListener('touchstart', dismiss);
        }

        document.addEventListener('click', dismiss);
        document.addEventListener('keydown', dismiss);
        document.addEventListener('touchstart', dismiss);

        document.addEventListener('scroll', function scrollInit() {
            initAudio();
            document.removeEventListener('scroll', scrollInit);
        });

        setTimeout(function () {
            if (prompt.parentNode) {
                prompt.style.opacity = '0';
                setTimeout(function () { if (prompt.parentNode) prompt.remove(); }, 800);
            }
        }, 10000);
    }

    // =========================================================================
    // ON-LOAD EFFECTS — immediate visual impact
    // =========================================================================
    function onLoadEffects() {
        // Subtle vignette fade-in
        setVignetteIntensity(0.3);
        setTimeout(function () {
            setVignetteIntensity(CONFIG.visual.vignetteBase);
        }, 3000);

        // Rare chance of a single flicker on load - REMOVED to prioritize terror (anticipation) over immediate reveal
        /*
        if (Math.random() < 0.3) {
            setTimeout(function () {
                screenFlicker();
            }, CONFIG.timing.onLoadDelay);
        }
        */
    }

    // --- PERIPHERAL SHADOWS (fleeting shapes at viewport edges) ---
    function setupPeripheralShadows() {
        if ('ontouchstart' in window) return;

        var shadow = document.createElement('div');
        shadow.id = 'horror-peripheral-shadow';
        shadow.setAttribute('aria-hidden', 'true');
        document.body.appendChild(shadow);

        var lastMove = Date.now();
        document.addEventListener('mousemove', function (e) {
            lastMove = Date.now();
            // Shadow stays in the periphery, away from the cursor
            var x = e.clientX > window.innerWidth / 2 ? 0 : window.innerWidth;
            var y = e.clientY > window.innerHeight / 2 ? 0 : window.innerHeight;
            
            // Only show if cursor is moving fast or at intervals
            if (Math.random() < 0.05) {
                shadow.style.left = x + 'px';
                shadow.style.top = y + 'px';
                shadow.style.opacity = '0.15';
                setTimeout(function () { shadow.style.opacity = '0'; }, 800);
            }
        });
    }

    // --- WORD TWITCH (subtle tremors on random words) ---
    function setupWordTwitch() {
        var ps = document.querySelectorAll('article p, .container p');
        if (!ps.length) return;

        function twitch() {
            var p = ps[Math.floor(Math.random() * ps.length)];
            
            // Use TreeWalker to find a valid text node to avoid destroying HTML tags
            var textNodes = [];
            var walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null, false);
            var node;
            while (node = walker.nextNode()) {
                if (node.textContent.trim().length > 10) {
                    textNodes.push(node);
                }
            }

            if (textNodes.length === 0) {
                setTimeout(twitch, 5000 + Math.random() * 10000);
                return;
            }

            var targetNode = textNodes[Math.floor(Math.random() * textNodes.length)];
            var words = targetNode.textContent.split(' ');
            var validIndices = [];
            
            for (var i = 0; i < words.length; i++) {
                if (words[i].length >= 4 && /^[a-zA-Z]+$/.test(words[i].trim())) {
                    validIndices.push(i);
                }
            }

            if (validIndices.length === 0) {
                setTimeout(twitch, 5000 + Math.random() * 10000);
                return;
            }

            var idx = validIndices[Math.floor(Math.random() * validIndices.length)];
            var originalWord = words[idx];
            
            // Create a span element to hold the twitching word
            var span = document.createElement('span');
            span.className = 'horror-twitch-word';
            span.textContent = originalWord;

            // Reconstruct the text content around the new span
            var beforeText = words.slice(0, idx).join(' ') + (idx > 0 ? ' ' : '');
            var afterText = (idx < words.length - 1 ? ' ' : '') + words.slice(idx + 1).join(' ');

            var parent = targetNode.parentNode;
            var beforeNode = document.createTextNode(beforeText);
            var afterNode = document.createTextNode(afterText);

            parent.insertBefore(beforeNode, targetNode);
            parent.insertBefore(span, targetNode);
            parent.insertBefore(afterNode, targetNode);
            parent.removeChild(targetNode);

            setTimeout(function () {
                if (span.parentNode) {
                    // Revert the DOM back to a single text node
                    var combinedText = beforeNode.textContent + span.textContent + afterNode.textContent;
                    var newNode = document.createTextNode(combinedText);
                    parent.insertBefore(newNode, beforeNode);
                    parent.removeChild(beforeNode);
                    parent.removeChild(span);
                    parent.removeChild(afterNode);
                }
                setTimeout(twitch, 8000 + Math.random() * 15000);
            }, 1200);
        }
        
        // Initial delay
        setTimeout(twitch, 10000);
    }

    // --- STARING EFFECT (words change color when hovered for long) ---
    function setupStaringEffect() {
        var ps = document.querySelectorAll('article p, .container p');

        for (var i = 0; i < ps.length; i++) {
            (function(p) {
                var timer = null;
                p.addEventListener('mouseenter', function (e) {
                    timer = setTimeout(function () {
                        p.style.transition = 'color 4s ease';
                        p.style.color = '#500'; // dark blood red
                        if (ready && Math.random() < 0.3) playWhisper();
                    }, 3000);
                });

                p.addEventListener('mouseleave', function (e) {
                    clearTimeout(timer);
                    if (p.style.color === 'rgb(85, 0, 0)' || p.style.color === '#500') {
                        p.style.transition = 'color 2s ease';
                        p.style.color = '';
                    }
                });
            })(ps[i]);
        }
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    function init() {
        createVignette();
        createFilmGrain();
        setupWhisperText();
        setupCursorTrail();
        setupScrollTriggers();
        scheduleAmbientEvent();
        onLoadEffects();
        startScreenBreathing();
        
        // New subtle interactions
        setupPeripheralShadows();
        setupWordTwitch();
        setupStaringEffect();

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
        playMetalScrape: playMetalScrape,
        playReverseSwell: playReverseSwell,
        playImpact: playImpact,
        playBreath: playBreath,
        playDissonantChord: playDissonantChord,
        glitch: glitchEffect,
        flicker: screenFlicker,
        scramble: scrambleText,
        bleed: textBleed,
        colorShift: colorShift,
        chromaticPulse: chromaticPulse,
        silence: playSuddenSilence,
        setDroneIntensity: setDroneIntensity,
        setVignetteIntensity: setVignetteIntensity,
        enableTrail: function () { cursorTrailOn = true; },
        disableTrail: function () { cursorTrailOn = false; },
    };

})();
