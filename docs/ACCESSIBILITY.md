# Accessibility and control notes

## Public showcase

The homepage is semantic HTML, works without JavaScript, has a **Skip to content** link, descriptive links, keyboard-visible focus rings, responsive layouts, and respects `prefers-reduced-motion`. Decorative skyline art has a text alternative. It does not auto-play audio or video. Contrast is designed to be legible, but an independent WCAG audit has not been performed.

## Living World lab

The [standalone ecology laboratory](../labs/living-world.html) provides labeled buttons for walking, grass interactions, fire/water and save controls. Its complete keyboard, assistive-technology and mobile usability have **not** been independently audited in this repository. The lab runs with JavaScript and may be more challenging for some users than the informational homepage.

Suggested first interactions: **Walk forward**, **Trample grass**, **Water patch**, **Advance 30 days**. Use **Export save JSON** before destructive resets. It is a separate experimental save from the full game's save.

## Live game

The main [Ash & Aether Site](https://ash-aether-clay-water.towre676.chatgpt.site/) has its own controls and access configuration, which are not managed by this GitHub repository. Keyboard, screen-reader, color-contrast and switch-control compliance should be tested on the live build, not inferred from this landing page.

## Reporting a problem

Use the [repository issues page](https://github.com/towre676-cloud/Aether-Ash-game-source/issues) with the browser, device, page, reproduction steps, expected behavior, and observed behavior. Do not include private account information or saved-game secrets.
