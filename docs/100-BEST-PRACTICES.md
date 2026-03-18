# 100 Best Practices for HTML Design, Storyboarding, Horror, and Cosmic Horror

*Sources compiled from: MDN Web Docs, W3C Accessibility Guidelines, Web.dev, "Save the Cat!" by Blake Snyder, "Story" by Robert McKee, "Danse Macabre" by Stephen King, "Supernatural Horror in Literature" by H.P. Lovecraft, and "The Weird and the Eerie" by Mark Fisher.*

## HTML & Web Design (MDN, W3C, Web.dev)
1. Use semantic HTML tags (`<main>`, `<article>`, `<section>`, `<nav>`) for structural meaning.
2. Ensure every page has a unique, descriptive `<title>`.
3. Include standard meta tags for viewport (`width=device-width, initial-scale=1.0`) and charset (`UTF-8`).
4. Provide comprehensive meta descriptions for SEO.
5. Use Open Graph (`og:`) and Twitter Card meta tags for social sharing.
6. Maintain a strict heading hierarchy (`<h1>` to `<h2>` to `<h3>`, without skipping levels).
7. Always provide meaningful `alt` attributes for images.
8. Use `aria-hidden="true"` for purely decorative elements.
9. Ensure interactive elements (buttons, links) have a minimum touch target size of 44x44px.
10. Implement "Skip to content" links for keyboard users.
11. Keep color contrast ratios at 4.5:1 or higher for body text.
12. Use responsive typography with `clamp()` or `calc()` for fluid scaling.
13. Load non-critical JavaScript with `defer` or `async`.
14. Use Subresource Integrity (SRI) hashes for third-party CDN scripts.
15. Provide `<noscript>` fallbacks or graceful degradation for JS-heavy features.
16. Implement proper CSS Custom Properties (variables) for theme consistency.
17. Minimize layout thrashing by avoiding interleaved DOM reads/writes.
18. Use `requestAnimationFrame` for all JavaScript animations.
19. Preconnect to critical third-party domains (fonts, CDNs).
20. Preload critical CSS and font assets.
21. Keep line lengths between 45 and 75 characters for optimal readability.
22. Set line-height to at least 1.5 for body text.
23. Ensure custom fonts swap gracefully using `font-display: swap`.
24. Avoid deep nesting in CSS to maintain selector performance.
25. Remove unused CSS/JS to keep bundle sizes small.

## Storyboarding & Interactive Narrative (Inkle Studios, Robert McKee, Blake Snyder)
26. Establish the premise and stakes within the first "beat" (Save the Cat).
27. Break long narratives into digestible "chunks" or acts to prevent cognitive overload.
28. Ensure visual pacing matches narrative pacing (e.g., faster animations during tense moments).
29. Use environmental storytelling to reveal exposition rather than info-dumping.
30. Give the user clear affordances for how to progress the story (scrolling, clicking).
31. Provide immediate feedback for user interactions (hover states, sound cues).
32. Ensure every interaction feels deliberate, not random.
33. Create a clear "Inciting Incident" early in the text.
34. Build rising action through progressively more intense revelations.
35. The "Dark Night of the Soul" moment should feel inescapable before the climax.
36. End chapters/acts on cliffhangers or paradigm shifts.
37. Use recurring motifs (visual or audio) to anchor the user.
38. Contrast moments of high tension with moments of calm (valleys and peaks).
39. Keep the protagonist's motivation clear, even if they are manipulated.
40. Allow the user's physical actions (scrolling) to dictate the rhythm of the text.
41. Use typography to reflect character state (e.g., erratic text for panic).
42. Maintain a consistent "voice" in the prose throughout the acts.
43. Ensure transitions between acts feel earned, not abrupt.
44. Limit the number of named characters to avoid confusing the reader.
45. Foreshadow major twists early in the narrative.
46. Use white space to force the reader to pause and reflect.
47. Treat the UI itself as an unreliable narrator if the story demands it.
48. Build a cohesive color palette that shifts alongside the story's mood.
49. Ensure the climax resolves the core thematic question.
50. Leave the user with a lingering emotional resonance in the denouement.

## General Horror & Tension (Stephen King, Frictional Games, Alfred Hitchcock)
51. Terror comes from anticipation; horror comes from the reveal. Prioritize terror.
52. The "bomb under the table" (Hitchcock): Show the audience the threat before the character sees it.
53. Isolate the protagonist—geographically, technologically, or psychologically.
54. Subvert safe spaces. A place that was once a sanctuary must become hostile.
55. Use sound design to create unease before visual scares.
56. Low-frequency (sub-bass) sounds induce physiological anxiety (infrasound).
57. High, dissonant frequencies create immediate alarm.
58. The "uncanny valley": Make familiar things slightly, inexplicably wrong.
59. Limit the player's control or vision to induce helplessness.
60. Use negative space (darkness, silence) as a canvas for the user's imagination.
61. Avoid jump scares unless they serve to release built-up, unbearable tension.
62. Gaslight the reader—make them doubt what they just read or saw.
63. Introduce corruption: physical, mental, or environmental decay.
64. Break the fourth wall subtly, making the user feel observed.
65. Delay the monster's full appearance as long as possible.
66. When the monster is revealed, it must violate the laws of nature.
67. Establish rules for the horror, then break them at the worst possible moment.
68. Use the fear of the unknown—what is hidden is always scarier than what is shown.
69. Create a sense of inevitability; the protagonist is trapped on a set track.
70. Employ body horror to trigger visceral, instinctual revulsion.
71. The loss of identity is scarier than the loss of life.
72. Use erratic, unpredictable pacing to keep the audience off-balance.
73. Silence is an effect. Sudden silence is terrifying.
74. Make the protagonist complicit in their own downfall.
75. Ensure the ending offers no true safety, only temporary reprieve.

## Cosmic Horror & Weird Fiction (H.P. Lovecraft, Mark Fisher)
76. Emphasize humanity's profound insignificance in the universe.
77. The threat must be ancient, predating human existence by epochs.
78. The threat is indifferent, not malicious. Malice implies human-like caring.
79. Reveal that human science and logic are fundamentally flawed or incomplete.
80. Introduce geometries or architectures that defy physical laws (non-Euclidean).
81. Use the "Weird" (Fisher): The presence of that which does not belong.
82. Use the "Eerie" (Fisher): The failure of absence (something is there when there should be nothing) or the failure of presence (nothing is there when there should be something).
83. The protagonist's sanity must degrade as they comprehend the truth.
84. Describe the indescribable using paradoxes ("a color out of space", "darkness that shines").
85. The cult or human antagonists must be pathetic compared to the cosmic beings.
86. Scale is terrifying—beings so large they mistake humans for bacteria.
87. Knowledge is a curse. The more you know, the more doomed you are.
88. Time is fluid; the past, present, and future occur simultaneously to the entities.
89. The universe is teeming with life, but it is all monstrous and predatory/scavenging.
90. Introduce the concept of "un-being" or erasure rather than simple death.
91. Reality is a thin membrane; the true universe is chaotic and agonizing.
92. Human evolution or consciousness is a mistake, a virus, or food.
93. The entity's true form cannot be perceived without destroying the observer's mind.
94. Use the ocean, the void of space, or deep earth as metaphors for the unknown.
95. There is no salvation or fighting back; the best outcome is to hide or delay.
96. Communication with the entities is impossible or maddeningly one-sided.
97. The horror lies in revelation, not physical violence.
98. Leave the origins of the entities ambiguous. Explanations diminish the awe.
99. The final realization should recontextualize everything the protagonist believed.
100. The story ends not with victory, but with an acceptance of cosmic dread.