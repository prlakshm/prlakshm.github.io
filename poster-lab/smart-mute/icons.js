/* Smart Mute glyphs, same geometry as the Figma components
   (file wOB2qvw7XJvY4Lz4KXAC51). Knockouts are SVG masks here; in Figma
   they are boolean subtracts. */
(function () {
  const BELL = "M12 2.8C8.7 2.8 6.4 5.4 6.4 8.7V12.1C6.4 13 6 13.9 5.4 14.6L4.4 15.7C3.9 16.3 4.3 17.2 5.1 17.2H18.9C19.7 17.2 20.1 16.3 19.6 15.7L18.6 14.6C18 13.9 17.6 13 17.6 12.1V8.7C17.6 5.4 15.3 2.8 12 2.8Z";
  const CLAP = "M9.6 19.3C9.9 20.5 10.8 21.3 12 21.3C13.2 21.3 14.1 20.5 14.4 19.3";
  const CLAPF = "M9.5 18.6H14.5C14.3 20.1 13.3 21.2 12 21.2C10.7 21.2 9.7 20.1 9.5 18.6Z";
  const SPK = "M0 -5C0.7 -1.4 1.4 -0.7 5 0C1.4 0.7 0.7 1.4 0 5C-0.7 1.4 -1.4 0.7 -5 0C-1.4 -0.7 -0.7 -1.4 0 -5Z";
  const SLASH = "M3.6 3.6L20.4 20.4";
  let uid = 0;
  const wrap = (inner, size) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible">${inner}</svg>`;
  const sw = 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

  window.ICONS = {
    smartMute(size, fill) {
      const id = "km" + uid++;
      const bt = fill ? "translate(0.48 0.86) scale(0.96)" : "translate(0.84 1.5) scale(0.93)";
      const st = fill ? "translate(18.3 16.7) scale(1)" : "translate(18.1 16.6) scale(0.98)";
      const bell = fill
        ? `<path d="${BELL}" fill="currentColor" ${sw}/><path d="${CLAPF}" fill="currentColor"/>`
        : `<path d="${BELL}" fill="none" ${sw}/><path d="${CLAP}" fill="none" ${sw}/>`;
      return wrap(
        `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32"><rect x="-4" y="-4" width="32" height="32" fill="#fff"/><path d="${SPK}" transform="${st}" fill="#000" stroke="#000" stroke-width="2.8" stroke-linejoin="round"/></mask></defs>` +
          `<g mask="url(#${id})"><g transform="${bt}">${bell}</g></g><path d="${SPK}" transform="${st}" fill="currentColor"/>`,
        size
      );
    },
    bellSlash(size, fill) {
      const id = "ks" + uid++;
      const bell = fill
        ? `<path d="${BELL}" fill="currentColor" ${sw}/><path d="${CLAPF}" fill="currentColor"/>`
        : `<path d="${BELL}" fill="none" ${sw}/><path d="${CLAP}" fill="none" ${sw}/>`;
      return wrap(
        `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32"><rect x="-4" y="-4" width="32" height="32" fill="#fff"/><path d="${SLASH}" stroke="#000" stroke-width="4.6" stroke-linecap="round"/></mask></defs>` +
          `<g mask="url(#${id})">${bell}</g><path d="${SLASH}" fill="none" ${sw}/>`,
        size
      );
    },
    trash(size, fill) {
      const id = "kt" + uid++;
      const top = `<path d="M4 6.4H20M9.4 6.4V4.9C9.4 4.2 9.9 3.7 10.6 3.7H13.4C14.1 3.7 14.6 4.2 14.6 4.9V6.4" fill="none" ${sw}/>`;
      if (!fill)
        return wrap(
          top +
            `<path d="M6 6.4L6.9 19.1C7 20.2 7.8 20.9 8.8 20.9H15.2C16.2 20.9 17 20.2 17.1 19.1L18 6.4" fill="none" ${sw}/><path d="M10 10V17.3M14 10V17.3" stroke="currentColor" stroke-width="1.53" stroke-linecap="round"/>`,
          size
        );
      return wrap(
        `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32"><rect x="-4" y="-4" width="32" height="32" fill="#fff"/><path d="M10 10V17.3M14 10V17.3" stroke="#000" stroke-width="1.53" stroke-linecap="round"/></mask></defs>` +
          top +
          `<path mask="url(#${id})" d="M6 6.4H18L17.1 19.1C17 20.2 16.2 20.9 15.2 20.9H8.8C7.8 20.9 7 20.2 6.9 19.1Z" fill="currentColor" ${sw}/>`,
        size
      );
    },
    sparkle(size) {
      return wrap(`<path d="${SPK}" transform="translate(12 12) scale(2)" fill="currentColor"/>`, size);
    },
  };

  /* timeline helpers shared by both prototypes */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  window.TL = {
    clamp,
    seg: (t, a, b) => clamp((t - a) / (b - a)),
    out: (p) => 1 - Math.pow(1 - p, 3),
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    /* critically-ish damped spring, dt in seconds since start */
    spring: (dt, stiff = 13, bounce = 0.18) =>
      dt <= 0 ? 0 : 1 - Math.exp(-dt * stiff * (1 - bounce)) * Math.cos(dt * stiff * bounce * 4.2),
    lerp: (a, b, p) => a + (b - a) * p,
  };
})();
