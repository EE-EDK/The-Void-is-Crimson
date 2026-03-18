# Audit Fixes: Rules 51-75

This audit focuses on Rules 51 through 75 from `100-BEST-PRACTICES.md`, covering General Horror & Tension.

## Rule 51: Terror vs. Horror (Anticipation vs. Reveal)
**File Path:** `horror-effects.js`
**Issue:** The `onLoadEffects` function has a 30% chance to trigger a screen flicker immediately upon page load.
**Recommendation:** Remove the immediate flicker to allow tension to build through narrative before the first visual scare.
**Actionable Fix:**
```javascript
// Old String (approx line 1030):
    function onLoadEffects() {
        // Subtle vignette fade-in
        setVignetteIntensity(0.3);
        setTimeout(function () {
            setVignetteIntensity(CONFIG.visual.vignetteBase);
        }, 3000);

        // Rare chance of a single flicker on load
        if (Math.random() < 0.3) {
            setTimeout(function () {
                screenFlicker();
            }, CONFIG.timing.onLoadDelay);
        }
    }

// New String:
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
```

## Rule 55: Sound Design Before Visuals
**File Path:** `horror-effects.js`
**Issue:** `horror-trigger` cases in `setupScrollTriggers` fire audio and visual effects simultaneously.
**Recommendation:** Introduce a slight delay to visual effects to allow the audio to create unease first.
**Actionable Fix:**
```javascript
// Old String (approx line 885):
                    case 'glitch':
                        glitchEffect();
                        if (ready) playSharpTone();
                        break;
// New String:
                    case 'glitch':
                        if (ready) playSharpTone();
                        setTimeout(glitchEffect, 150); // 150ms delay to let audio lead
                        break;

// Old String (approx line 911):
                    case 'rumble':
                        if (ready) {
                            playRumble(5);
                            playImpact();
                        }
                        glitchEffect();
                        pulseVignette(0.6, 5000);
                        break;
// New String:
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
```

## Rule 61: Avoid Premature Jump Scares
**File Path:** `The-Fifth-Harmonic-ACT1.html`
**Issue:** The very first paragraph of the story contains a `scramble` trigger, and subsequent early paragraphs use high-intensity triggers (`glitch`, `bleed`) before tension is established.
**Recommendation:** Remove the `scramble` from the first paragraph and downgrade early triggers to more subtle effects like `whisper` or `heartbeat`.
**Actionable Fix:**
```javascript
// Old String (approx line 64):
        <p class="horror-trigger" data-horror="scramble">The headache had been living behind Alex Reeves's left eye for six days...

// New String:
        <p>The headache had been living behind Alex Reeves's left eye for six days...

// Old String (approx line 93):
        <p class="horror-trigger" data-horror="glitch">The world outside shifted.</p>

// New String:
        <p class="horror-trigger" data-horror="flicker">The world outside shifted.</p>
```

## Rule 67: Breaking Established Rules
**File Path:** `The-New-Rebirth-ACTIII.html`
**Issue:** The UI remains functionally "safe" and predictable even as the world is consumed by the Weave.
**Recommendation:** Induce erratic behavior in the progress bar or scroll mechanics in Act 3.
**Actionable Fix:**
```javascript
// Old String (approx line 1104):
            function updateProgressBar() {
                const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
                const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const scrolled = (winScroll / height) * 100;
                document.getElementById('progress-bar').style.width = scrolled + '%';
                progressTicking = false;
            }

// New String:
            function updateProgressBar() {
                const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
                const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                let scrolled = (winScroll / height) * 100;
                
                // Rule 67: Subvert the "safe" UI. As the Weave takes over, the progress bar becomes erratic.
                if (scrolled > 50) {
                    const jitter = (Math.random() - 0.5) * 5;
                    scrolled += jitter;
                    if (Math.random() > 0.98) document.getElementById('progress-bar').style.backgroundColor = '#00f'; // Flicker blue (The Weave)
                    else document.getElementById('progress-bar').style.backgroundColor = '';
                }
                
                document.getElementById('progress-bar').style.width = scrolled + '%';
                progressTicking = false;
            }
```

## Rule 73: Sudden Silence
**File Path:** `horror-effects.js`
**Issue:** There is no mechanism for sudden, absolute silence, which is a powerful horror effect.
**Recommendation:** Add a `playSuddenSilence` function to the `HorrorEngine`.
**Actionable Fix:**
```javascript
// Old String (add after playRumble function, approx line 655):
    // --- BREATH SOUNDS ---

// New String:
    // --- SUDDEN SILENCE ---
    function playSuddenSilence() {
        if (!ready || !master) return;
        const now = ctx.currentTime;
        // Kill all drone nodes immediately
        droneNodes.forEach(node => {
            try { node.stop(now); } catch(e) {}
        });
        droneNodes = [];
        // Abruptly ramp master to 0
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 0.01);
        
        // Restore after 3-5 seconds
        setTimeout(function() {
            master.gain.linearRampToValueAtTime(CONFIG.audio.masterVolume, ctx.currentTime + 2);
            startDrone();
        }, 3000 + Math.random() * 2000);
    }

// Also add to public API:
// Old String (approx line 1180):
        colorShift: colorShift,
        chromaticPulse: chromaticPulse,
// New String:
        colorShift: colorShift,
        chromaticPulse: chromaticPulse,
        silence: playSuddenSilence,
```
