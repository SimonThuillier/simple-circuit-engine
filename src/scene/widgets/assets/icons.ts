/**
 * Embedded heroicon SVGs (24x24 outline) used by the integrated widgets.
 *
 * Sources: https://heroicons.com/ (MIT). Inlined as raw markup so the library
 * ships no external icon dependency and CSS `currentColor` drives the stroke.
 */

export const wrenchScrewdriverIcon = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"/>
</svg>
`.trim();

export const cubeTransparentIcon = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3 2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75 2.25-1.313M12 21.75V19.5m0 2.25-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25"/>
</svg>
`.trim();

export const barsArrowDownIcon = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 16.5m0 0L21 12.75M17.25 16.5V3"/>
</svg>
`.trim();

export const playIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path fill-rule="evenodd" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" clip-rule="evenodd"/>
</svg>
`.trim();

export const pauseIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor">
  <path fill-rule="evenodd" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" clip-rule="evenodd"/>
</svg>
`.trim();

export const stepIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
  <path fill-rule="evenodd" stroke-linejoin="round" d="M21 7.5V18M15 7.5V18M3 16.811V8.69c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954Z" clip-rule="evenodd"/>
</svg>
`.trim();

export const stopIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clip-rule="evenodd"/>
</svg>
`.trim();

export const questionMarkIcon = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
</svg>
`.trim();





/**
 * Wrap an inline SVG string into a `<span>` so it can be appended to any
 * widget DOM. The SVG inherits `color` from the parent button so styling stays
 * declarative.
 */
export function iconElement(svg: string, sizePx = 18): HTMLElement {
  const span = document.createElement('span');
  span.innerHTML = svg;
  Object.assign(span.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    color: 'inherit',
    pointerEvents: 'none',
  });
  const svgEl = span.querySelector('svg');
  if (svgEl) {
    svgEl.setAttribute('width', `${sizePx}`);
    svgEl.setAttribute('height', `${sizePx}`);
  }
  return span;
}
