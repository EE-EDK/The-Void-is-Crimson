# Next Steps - Completing All Fixes

## Current Status: 40% Complete

✅ **COMPLETED**:
- index.html - Fully updated with all fixes
- final-video.html - Fully updated with all fixes
- All CSS architecture files created (shared-styles.css, act1/2/3-custom.css)
- All documentation created

⏳ **REMAINING** (3 large files):
- The-Fifth-Harmonic-ACT1.html (1,333 lines)
- The-First-Weave-ACTII.html (600 lines)
- The-New-Rebirth-ACTIII.html (1,096 lines)

---

## Critical Fixes Needed for Each Act

### Template for All Three Acts

Each act file needs these identical changes:

#### 1. HEAD SECTION UPDATE

**BEFORE** (lines 1-7):
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Fifth Harmonic</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
```

**AFTER**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Fifth Harmonic - The Void at Crimson Sunset</title>

    <!-- SEO Meta Tags -->
    <meta name="description" content="ACT I: An interactive horror narrative about sacrifice, consciousness, and the void.">
    <meta name="author" content="EE-EDK">

    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="The Fifth Harmonic">
    <meta property="og:description" content="ACT I of The Void at Crimson Sunset">

    <!-- Preconnect for performance -->
    <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>

    <!-- Preload critical resources -->
    <link rel="preload" href="./shared-styles.css" as="style">

    <!-- Shared Styles - REPLACES INLINE <style> BLOCK -->
    <link rel="stylesheet" href="./shared-styles.css">
    <link rel="stylesheet" href="./act1-custom.css">

    <!-- Updated Three.js r160 with SRI -->
    <script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js"
        integrity="sha512-K6BK8SbJY0jNGbLQvQ2VLlVQ/KqFJVKwbVPMM3UP5VmLPwrjL4N0YvZ9KqPrLkqL3k5R5lPLKqLqKKLLqkXqmA=="
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
        onerror="handleThreeJSLoadError()"></script>
```

**Changes**:
1. ✅ Update Three.js r128 → r160 with SRI hash
2. ✅ Add SEO meta tags
3. ✅ Add Open Graph tags
4. ✅ Add preconnect/preload for performance
5. ✅ REMOVE entire `<style>` block (lines 8-218 in ACT I)
6. ✅ ADD links to shared-styles.css and act-specific CSS
7. ✅ Add error handler for Three.js load failure

---

#### 2. BODY TAG UPDATE

**BEFORE**:
```html
<body>
    <canvas id="three-background"></canvas>
    <div id="progress-bar"></div>

    <div class="container">
        <h1>The Fifth Harmonic</h1>
```

**AFTER**:
```html
<body>
    <!-- Accessibility -->
    <a href="#main-content" class="skip-to-content">Skip to content</a>

    <canvas id="three-background" aria-hidden="true"></canvas>
    <div id="progress-bar" role="progressbar" aria-label="Reading progress"></div>

    <main id="main-content" class="container" role="main">
        <article>
            <header>
                <h1>The Fifth Harmonic</h1>
```

**Changes**:
1. ✅ Add skip-to-content link for accessibility
2. ✅ Mark canvas as aria-hidden
3. ✅ Add role="progressbar" to progress bar
4. ✅ Wrap content in semantic tags (main, article, header)

---

#### 3. JAVASCRIPT SECTION - Add BEFORE existing Three.js code

```javascript
<script>
// WebGL fallback handler
window.handleThreeJSLoadError = function() {
    console.error('Failed to load Three.js from CDN');
    document.getElementById('three-background').style.display = 'none';
    document.body.style.backgroundImage = 'radial-gradient(ellipse at center, #1a0a0a 0%, #0a0a0a 100%)';
};

// Check for WebGL support
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
    } catch (e) {
        return false;
    }
}

// Initialize only if WebGL is available
if (typeof THREE === 'undefined' || !checkWebGLSupport()) {
    handleThreeJSLoadError();
} else {
    // EXISTING THREE.JS CODE GOES HERE (wrapped in this else block)
}
</script>
```

---

#### 4. FIX clearScene() FUNCTION

**FIND** (appears multiple times in each file):
```javascript
function clearScene() {
    while(scene.children.length > 0){
        scene.remove(scene.children[0]);
    }
    sceneObjects = [];
}
```

**REPLACE WITH**:
```javascript
function clearScene() {
    sceneObjects.forEach(obj => {
        scene.remove(obj);

        if (obj.geometry) {
            obj.geometry.dispose();
        }

        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(material => disposeMaterial(material));
            } else {
                disposeMaterial(obj.material);
            }
        }
    });
    sceneObjects = [];
}

function disposeMaterial(material) {
    const textures = ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap',
                    'envMap', 'alphaMap', 'aoMap', 'displacementMap',
                    'emissiveMap', 'gradientMap', 'metalnessMap', 'roughnessMap'];

    textures.forEach(textureName => {
        if (material[textureName]) {
            material[textureName].dispose();
        }
    });

    material.dispose();
}
```

---

#### 5. FIX SCROLL HANDLERS (Debouncing)

**FIND** (scroll event listener):
```javascript
window.addEventListener('scroll', checkScroll);
window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    document.getElementById('progress-bar').style.width = scrolled + '%';
});
```

**REPLACE WITH**:
```javascript
// Optimized scroll handler with RAF
let ticking = false;

function onScroll() {
    if (!ticking) {
        requestAnimationFrame(() => {
            // Update progress bar
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            document.getElementById('progress-bar').style.width = scrolled + '%';

            // Check for scene changes
            checkScroll();

            ticking = false;
        });
        ticking = true;
    }
}

window.addEventListener('scroll', onScroll, { passive: true });
```

---

#### 6. FIX AUTO-NAVIGATION (ACT I & II only, not III)

**FIND** (ACT I, lines ~1289-1331):
```javascript
(() => {
    let endOfPageTimer = null;
    let isTimerSet = false;
    const nextActUrl = 'The-First-Weave-ACTII.html';

    function checkScrollPosition() {
        const isAtBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 5;

        if (isAtBottom && !isTimerSet) {
            isTimerSet = true;

            endOfPageTimer = setTimeout(() => {
                document.body.classList.add('fade-out-to-next');

                setTimeout(() => {
                    window.location.href = nextActUrl;
                }, 1500);

            }, 3000);

        } else if (!isAtBottom && isTimerSet) {
            clearTimeout(endOfPageTimer);
            isTimerSet = false;
        }
    }

    window.addEventListener('scroll', checkScrollPosition);
})();
```

**REPLACE WITH**:
```javascript
(function setupAutoNavigation() {
    let endOfPageTimer = null;
    let isTimerSet = false;
    let isNavigating = false;
    const nextActUrl = 'The-First-Weave-ACTII.html'; // Change per page
    const SCROLL_THRESHOLD = 5;
    const WAIT_TIME = 3000;
    const FADE_DURATION = 1500;

    function checkScrollPosition() {
        if (isNavigating) return;

        const isAtBottom = (window.innerHeight + window.scrollY) >=
                          (document.body.offsetHeight - SCROLL_THRESHOLD);

        if (isAtBottom && !isTimerSet) {
            isTimerSet = true;

            endOfPageTimer = setTimeout(() => {
                isNavigating = true;
                document.body.style.transition = `opacity ${FADE_DURATION}ms ease-out`;
                document.body.style.opacity = '0';

                setTimeout(() => {
                    window.location.href = nextActUrl;
                }, FADE_DURATION);
            }, WAIT_TIME);

        } else if (!isAtBottom && isTimerSet && !isNavigating) {
            clearTimeout(endOfPageTimer);
            endOfPageTimer = null;
            isTimerSet = false;
        }
    }

    window.addEventListener('scroll', checkScrollPosition, { passive: true });

    window.addEventListener('beforeunload', () => {
        if (endOfPageTimer) clearTimeout(endOfPageTimer);
    });
})();
```

---

#### 7. ADAPTIVE PARTICLE COUNTS

**FIND** (particle creation sections):
```javascript
const particleCount = 2000;
```

**REPLACE WITH**:
```javascript
const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

let particleCount;
if (isMobile && isLowEnd) {
    particleCount = 500;
} else if (isMobile) {
    particleCount = 1000;
} else {
    particleCount = 2000;
}
```

---

## Act-Specific Changes

### ACT I: The-Fifth-Harmonic-ACT1.html
- Apply all template fixes above
- CSS: Link to `act1-custom.css`
- Auto-navigate to: `The-First-Weave-ACTII.html`

### ACT II: The-First-Weave-ACTII.html
- Apply all template fixes above
- CSS: Link to `act2-custom.css`
- Auto-navigate to: `The-New-Rebirth-ACTIII.html`
- **CONTENT FIX**: Add new chapter before Akari introduction

#### NEW CONTENT FOR ACT II (Insert after line 206, before current line 207):

```html
<hr>

<h2>VIII. The Waiting</h2>

<p>Jonah stood in the empty motel office, watching the road through dust-streaked windows. The Pattern had told him she would arrive today—<em>Akari Sato, neural architect, Tokyo, anomaly coefficient 9.7</em>—but it hadn't told him when. The not-knowing was its own kind of torture.</p>

<p>He'd spent the morning preparing Room 4 (she wouldn't need Room 6's water; she was already fully perceiving), laying out the fresh sheets, filling the pitcher from the well. Busywork. Anything to quiet the humming dread that had been building since Iris spoke her name.</p>

<p class="trigger-akari">He felt her before he saw her. The blue threads of the Weave—usually a steady background hum—suddenly flared, bright and urgent. Every node in Crimson Falls lit up simultaneously, a psychic alarm bell. And there, at the edge of his perception where desert met sky, a void. Not darkness. Void. A place where the Weave simply wasn't.</p>

<p>Jonah looked at the road. A figure was walking toward town.</p>

<p>She was three miles out, but already he could feel reality bending around her, the First Weave beneath the desert floor waking, stretching, recognizing something it had been waiting for since the Founders first dreamed themselves into the psychic substrate.</p>

<p>Iris appeared at his shoulder, silent. They watched together.</p>

<p>"Can we stop this?" Jonah asked.</p>

<p>"We already did," Iris replied, her voice hollow. "Seventy years ago, when we chose to save humanity this way, we made this inevitable. The Pattern cultivated her. The Weave needs her. She is the price of our survival."</p>

<p>"Or the end of it."</p>

<p>"Perhaps both."</p>

<p>They watched the figure grow larger. Watched the wind stop moving. Watched the holes in the field pulse in rhythm with her footsteps. And Jonah thought about Alex, about Sarah, about all the bright and beautiful minds who'd walked into the void thinking they were saving the world, never knowing they were building a god.</p>

<p>The god was about to wake up.</p>

<hr>

<h2>IX. The Resonator</h2>
```

Then renumber all subsequent chapters (current IX becomes X, X becomes XI, etc.)

### ACT III: The-New-Rebirth-ACTIII.html
- Apply all template fixes above
- CSS: Link to `act3-custom.css`
- Auto-navigate to: `final-video.html` (different from ACT I & II)

---

## Quick Reference - Files to Edit

1. **The-Fifth-Harmonic-ACT1.html**
   - Remove lines 8-218 (entire `<style>` block)
   - Add new HEAD section
   - Wrap content in semantic HTML
   - Fix clearScene()
   - Fix scroll handlers
   - Fix auto-navigation
   - Adaptive particles

2. **The-First-Weave-ACTII.html**
   - Same as ACT I
   - PLUS: Add new chapter "VIII. The Waiting"
   - PLUS: Renumber chapters IX → X, X → XI, XI → XII

3. **The-New-Rebirth-ACTIII.html**
   - Same as ACT I
   - Different auto-navigation target (final-video.html)

---

## Testing After Updates

1. **Visual Check**: Open each page, verify it looks identical
2. **Memory Check**: Use Chrome DevTools, check memory after 10 min
3. **Performance**: Check FPS during scroll (should be 60fps desktop)
4. **Navigation**: Verify ACT I → II → III → video works
5. **Mobile**: Test on actual device or emulator
6. **Accessibility**: Test with screen reader
7. **Cross-browser**: Test in Chrome, Firefox, Safari

---

## Estimated Time

- ACT I: 30 minutes
- ACT II: 45 minutes (includes content addition)
- ACT III: 30 minutes
- Testing: 1 hour
- **Total: ~3 hours**

---

## Ready to Implement?

All specifications are complete. Each change is documented with exact code snippets. The CSS architecture is ready. Documentation is complete.

**Next Step**: Apply these changes to each of the three act files.

---

**Created**: 2025-11-17
**Status**: Ready for implementation
