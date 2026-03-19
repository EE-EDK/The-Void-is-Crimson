# Audit Fixes: Rules 26-50

This document outlines the violations of Rules 26 through 50 from `100-BEST-PRACTICES.md` found in the codebase and provides actionable recommendations for fixes.

---

## Rule 29: Environmental Storytelling vs. Info-Dumping
**Issue:** Act I (Section III/IV) and Act III (Section XVI/XVII) rely heavily on "info-dumping" where characters (Dr. Venn, Iris, The Nine) explain complex cosmic horror concepts in long dialogue blocks.
**Recommendation:** Break up these explanations. Use the Three.js background or interactive elements to "show" the concepts (e.g., the threshold, the Pattern's growth) while the characters provide shorter, more focused commentary.

### File: `The-Fifth-Harmonic-ACT1.html`
**Location:** Section III and IV (Explanations by Dr. Venn and Iris)
**Old String:**
```html
        <p>"Because you're compatible." A new voice, coming from the stage.</p>

        <p>Alex turned.</p>

        <p>The woman standing there was in her forties, with silver-streaked dark hair pulled into a loose bun and the kind of face that would be called striking rather than beautiful—sharp cheekbones, intense gray eyes, a mouth that looked like it had forgotten how to smile casually. She wore a simple black dress and held a viola, the instrument cradled against her body like something alive.</p>

        <p>"I'm Iris Kohler," she said. "And I've been waiting twenty-two years to meet you again."</p>

        <hr>

        <p>"We met when you were five years old," Iris said, running rosin across her bow with slow, deliberate strokes. "Your mother brought you here. Not to Crimson Falls—this town didn't exist yet, not the way it does now. But to the field. To the holes. She was one of ours, part of the Pattern, and she'd recently given birth to a child who showed remarkable auditory sensitivity."</p>
```
**New String:**
```html
        <p>"Because you're compatible." A new voice, coming from the stage.</p>

        <p>Alex turned.</p>

        <p class="horror-trigger" data-horror="flicker">The woman standing there was in her forties, with silver-streaked dark hair pulled into a loose bun and the kind of face that would be called striking rather than beautiful. She held a viola like a weapon.</p>

        <p>"I'm Iris Kohler," she said. "And I've been waiting twenty-two years to meet you again."</p>

        <hr>

        <p class="trigger-pattern">"We met when you were five years old," Iris said. As she spoke, the air began to shimmer with those same red threads Alex had seen in the desert. "Your mother brought you to the field. To the holes. She was part of the Pattern."</p>
```
*(Note: This is an example of breaking up the text and adding triggers to 'show' the Pattern during the explanation.)*

---

## Rule 30: Clear Affordances for Progression
**Issue:** The auto-navigation at the end of acts (using a timer and scroll check) can be abrupt and takes control away from the user.
**Recommendation:** Add a clear "Continue" button at the end of each act so the user can choose when to move forward after reflecting on the ending.

### File: `The-Fifth-Harmonic-ACT1.html`, `The-First-Weave-ACTII.html`, `The-New-Rebirth-ACTIII.html`
**Location:** End of the `<article>` tag.
**Old String:**
```html
        <p class="end">[END]</p>

        </article>
```
**New String:**
```html
        <p class="end">[END]</p>
        
        <div class="next-act-navigation">
            <a href="The-First-Weave-ACTII.html" class="next-act-link">Continue to ACT II</a>
        </div>

        </article>
```
*(Note: Requires styling for `.next-act-link` in `shared-styles.css` similar to `index.html`'s act links.)*

---

## Rule 41: Typography for Character State
**Issue:** Panic and emotional distress in the protagonist (e.g., Alex's realization in Act I, Jonah's grief in Act III) are not reflected in the typography.
**Recommendation:** Use CSS classes to alter letter-spacing, font-style, or line-height during moments of high distress.

### File: `The-Fifth-Harmonic-ACT1.html`
**Location:** Alex's reaction to the truth in Section III.
**Old String:**
```html
        <p>"No. I'm not doing this. I'm getting in my car and leaving."</p>

        <p>"You can't," Elena said. She was crying, he realized. Tears running down her face while her expression remained placid.</p>
```
**New String:**
```html
        <p class="horror-panic">"No. I'm not doing this. I'm getting in my car and leaving."</p>

        <p>"You can't," Elena said. She was crying, he realized. Tears running down her face while her expression remained placid.</p>
```
*(Note: Requires `.horror-panic { letter-spacing: -1px; font-style: italic; }` in `shared-styles.css`.)*

---

## Rule 46: Strategic Use of White Space
**Issue:** Large reveals or emotional shocks are often followed immediately by more text, not allowing the reader time to process.
**Recommendation:** Insert `.narrative-pause` blocks after major reveals.

### File: `The-Fifth-Harmonic-ACT1.html`
**Location:** After the reveal of the "field of holes".
**Old String:**
```html
        <p>"What the fuck," Alex whispered.</p>

        <p>"Portals," Dr. Venn said behind him. "Not to another place, but to another state of being."</p>
```
**New String:**
```html
        <p>"What the fuck," Alex whispered.</p>

        <div class="narrative-pause"></div>

        <p>"Portals," Dr. Venn said behind him. "Not to another place, but to another state of being."</p>
```

---

## Rule 28: Visual Pacing
**Issue:** While scroll-based intensity is good, "tense" animations don't necessarily speed up.
**Recommendation:** Update `horror-effects.js` to allow a multiplier for animation speeds (like glitch/scramble) based on scroll intensity.

### File: `horror-effects.js`
**Location:** `updateScrollIntensity` function.
**Old String:**
```javascript
    function updateScrollIntensity() {
        var total = document.documentElement.scrollHeight - window.innerHeight;
        if (total <= 0) return;
        var pct = window.scrollY / total;
        scrollIntensity = Math.min(pct * 1.4, 1);
        setVignetteIntensity(CONFIG.visual.vignetteBase + scrollIntensity * 0.2);
        setDroneIntensity(scrollIntensity * 0.5);
    }
```
**New String:**
```javascript
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
```

---

## Rule 37: Recurring Motifs
**Issue:** Rule is followed well, but the coordinates motif could be reinforced visually.
**Recommendation:** Add the coordinates as a "whisper" or "glitch" text element in later acts to remind the user of the origin point.

### File: `The-New-Rebirth-ACTIII.html`
**Location:** Jonah's reflections in Section XIV.
**Old String:**
```html
        <p>And he was the only node without a connection. The only mind still screaming in the silence.</p>
```
**New String:**
```html
        <p>And he was the only node without a connection. The only mind still screaming in the silence, haunted by the numbers that started it all: <span class="horror-whisper" data-whisper="43°41'23&quot;N 113°18'45&quot;W">43°41'23"N 113°18'45"W</span>.</p>
```
