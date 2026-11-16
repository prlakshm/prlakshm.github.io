/* Generic iOS Settings tiles and stock app icons, 30×30, plain SVG so the
   same strings can go into Figma via createNodeFromSvg. Only apps every
   iPhone ships with; no personal data. Text-free except Calendar (Figma
   drops SVG text, so the Figma build adds that date as real text). */
(function () {
  const W = "#fff";
  let gid = 0;
  const svg = (inner, defs = "") =>
    `<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">${defs ? `<defs>${defs}</defs>` : ""}${inner}</svg>`;
  const lin = (a, b) => { const id = "g" + gid++; return [`url(#${id})`, `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`]; };
  const bg = (fill) => fill === "#fff" ? `<rect x=".3" y=".3" width="29.4" height="29.4" rx="6.8" fill="#fff" stroke="#DEDEE3" stroke-width=".6"/>` : `<rect width="30" height="30" rx="7" fill="${fill}"/>`;
  const tile = (fill, inner) => svg(bg(fill) + inner);
  const gtile = (a, b, inner) => { const [u, d] = lin(a, b); return svg(bg(u) + inner, d); };
  const st = (w = 1.8) => `fill="none" stroke="${W}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const rays = () => { let s = ""; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, c = Math.cos(a), n = Math.sin(a);
    s += `<path d="M${(15 + c * 5.6).toFixed(2)} ${(15 + n * 5.6).toFixed(2)}L${(15 + c * 7.6).toFixed(2)} ${(15 + n * 7.6).toFixed(2)}" ${st(1.8)}/>`; } return s; };
  const petals = (cols, r, rx, ry, op) => cols.map((c, i) => { const a = i * 360 / cols.length;
    return `<ellipse cx="15" cy="${15 - r}" rx="${rx}" ry="${ry}" fill="${c}" opacity="${op}" transform="rotate(${a} 15 15)"/>`; }).join("");

  const T = {
    airplane: tile("#FF9500", `<path d="M15 6.5c.8 0 1.3.9 1.3 2v4.3l6.2 3.6v1.8l-6.2-1.9v3.8l1.8 1.4v1.4L15 22l-3.1.9v-1.4l1.8-1.4v-3.8l-6.2 1.9v-1.8l6.2-3.6V8.5c0-1.1.5-2 1.3-2z" fill="${W}"/>`),
    wifi: tile("#007AFF", `<path d="M7.6 12.4a10.5 10.5 0 0 1 14.8 0" ${st(2.1)}/><path d="M10.3 15.3a6.6 6.6 0 0 1 9.4 0" ${st(2.1)}/><circle cx="15" cy="19.4" r="1.7" fill="${W}"/>`),
    bluetooth: tile("#007AFF", `<path d="M10.6 11.2l8 7-3.9 3.4V8.4l3.9 3.4-8 7" ${st(1.8)}/>`),
    cellular: tile("#34C759", `<path d="M15 14.2v8" ${st(2)}/><circle cx="15" cy="12.6" r="1.8" fill="${W}"/><path d="M11.4 9.2a5 5 0 0 0 0 6.8M18.6 9.2a5 5 0 0 1 0 6.8M8.9 6.9a8.4 8.4 0 0 0 0 11.4M21.1 6.9a8.4 8.4 0 0 1 0 11.4" ${st(1.7)}/>`),
    hotspot: tile("#34C759", `<path d="M12.6 13.6l-2.1 2.1a3.1 3.1 0 0 0 4.4 4.4l2.1-2.1M17.4 16.4l2.1-2.1a3.1 3.1 0 0 0-4.4-4.4l-2.1 2.1M13.2 16.8l3.6-3.6" ${st(2)}/>`),
    battery: tile("#34C759", `<rect x="6.5" y="11" width="15" height="8" rx="2.2" fill="${W}"/><rect x="22.2" y="13.4" width="1.7" height="3.2" rx=".85" fill="${W}"/>`),
    general: tile("#8E8E93", `<circle cx="15" cy="15" r="7.4" fill="none" stroke="${W}" stroke-width="2.6" stroke-dasharray="2.3 1.57"/><circle cx="15" cy="15" r="5.4" fill="none" stroke="${W}" stroke-width="2.2"/><circle cx="15" cy="15" r="1.6" fill="${W}"/>`),
    accessibility: tile("#007AFF", `<circle cx="15" cy="15" r="8.2" ${st(1.5)}/><circle cx="15" cy="10.6" r="1.5" fill="${W}"/><path d="M10.4 13h9.2M15 13v3.6l-2.1 4.2M15 16.6l2.1 4.2" ${st(1.6)}/>`),
    camera: tile("#8E8E93", `<rect x="6.8" y="10.3" width="16.4" height="11.4" rx="2.6" fill="${W}"/><rect x="11.6" y="8.3" width="6.8" height="3.4" rx="1.2" fill="${W}"/><circle cx="15" cy="16" r="3.6" fill="#8E8E93"/><circle cx="15" cy="16" r="2.2" fill="${W}"/>`),
    control: tile("#8E8E93", `<rect x="7.8" y="8.6" width="14.4" height="5.4" rx="2.7" ${st(1.4)}/><circle cx="19.5" cy="11.3" r="1.8" fill="${W}"/><rect x="7.8" y="16" width="14.4" height="5.4" rx="2.7" fill="${W}"/><circle cx="10.5" cy="18.7" r="1.8" fill="#8E8E93"/>`),
    display: tile("#007AFF", `<circle cx="15" cy="15" r="3.7" fill="${W}"/>` + rays()),
    homescreen: tile("#2F6BF6", `<rect x="10" y="6.8" width="10" height="16.4" rx="2.4" ${st(1.6)}/><circle cx="13.2" cy="11.2" r="1.1" fill="${W}"/><circle cx="16.8" cy="11.2" r="1.1" fill="${W}"/><circle cx="13.2" cy="14.8" r="1.1" fill="${W}"/><circle cx="16.8" cy="14.8" r="1.1" fill="${W}"/>`),
    search: tile("#8E8E93", `<circle cx="13.6" cy="13.6" r="4.7" ${st(2.1)}/><path d="M17.2 17.2l4 4" ${st(2.5)}/>`),
    siri: (() => { const id = "g" + gid++; return svg(bg("#101014") + `<circle cx="15" cy="15" r="8.4" fill="url(#${id})"/><ellipse cx="15" cy="15" rx="5.2" ry="2.4" fill="${W}" opacity=".55" transform="rotate(-25 15 15)"/>`,
      `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF4FD8"/><stop offset=".5" stop-color="#6A5CFF"/><stop offset="1" stop-color="#18D2FF"/></linearGradient>`); })(),
    standby: tile("#1C1C1E", `<rect x="7" y="10.5" width="7.4" height="9" rx="2" fill="${W}"/><rect x="15.6" y="10.5" width="7.4" height="9" rx="2" fill="${W}"/><path d="M10.7 13v2.3l1.3.9" fill="none" stroke="#1C1C1E" stroke-width="1.2" stroke-linecap="round"/>`),
    wallpaper: tile("#34AADC", petals(["#fff", "#fff", "#fff", "#fff", "#fff", "#fff"], 3.8, 2.6, 3.6, 0.9) + `<circle cx="15" cy="15" r="1.8" fill="#34AADC"/>`),
    notifications: tile("#FF3B30", `<rect x="7.8" y="8.6" width="13.6" height="13.6" rx="3.6" ${st(1.8)}/><circle cx="20.6" cy="9.4" r="3.4" fill="#FF3B30"/><circle cx="20.6" cy="9.4" r="2.5" fill="${W}"/>`),
    sounds: tile("#FF2D55", `<path d="M7.8 12.6h3l4.2-3.6v12l-4.2-3.6h-3z" fill="${W}"/><path d="M18 12.2a4 4 0 0 1 0 5.6M20.4 9.9a7.3 7.3 0 0 1 0 10.2" ${st(1.7)}/>`),
    focus: tile("#5856D6", `<path d="M17.3 7.4A8 8 0 1 0 22.6 18a6.6 6.6 0 0 1-5.3-10.6z" fill="${W}"/>`),
    screentime: tile("#5856D6", `<path d="M10.2 7.6h9.6M10.2 22.4h9.6M11.2 7.6c0 4 3.8 5.4 3.8 7.4s-3.8 3.4-3.8 7.4M18.8 7.6c0 4-3.8 5.4-3.8 7.4s3.8 3.4 3.8 7.4" ${st(1.6)}/><path d="M12.4 21.4c.6-2 2.6-2.8 2.6-2.8s2 .8 2.6 2.8z" fill="${W}"/>`),
  };

  const A = {
    "App Store": gtile("#22C1FF", "#0A6CF5", `<path d="M13.2 8.6l6.6 11.6M16.8 8.6l-6.6 11.6M8.6 17h12.8" ${st(2.1)}/>`),
    Calendar: svg(bg("#fff") + `<text x="15" y="10.4" text-anchor="middle" font-family="-apple-system,system-ui" font-size="5.6" font-weight="600" fill="#FF3B30">TUE</text><text x="15" y="23" text-anchor="middle" font-family="-apple-system,system-ui" font-size="13.5" font-weight="300" fill="#000">14</text>`),
    Clock: svg(bg("#000") + `<circle cx="15" cy="15" r="10.6" fill="#fff"/><path d="M15 15V8.6M15 15l4.4 2.6" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"/><path d="M15 15l-3.6 6.6" stroke="#FF9500" stroke-width=".9" stroke-linecap="round"/><circle cx="15" cy="15" r="1.1" fill="#FF9500"/>`),
    FaceTime: gtile("#5BF675", "#0CBD2A", `<rect x="6.6" y="10.2" width="11.6" height="9.6" rx="2.6" fill="${W}"/><path d="M18.9 13.6l4.6-2.7v8.2l-4.6-2.7z" fill="${W}"/>`),
    "Find My": gtile("#3FDD70", "#18B44B", `<circle cx="15" cy="15" r="9.2" fill="${W}"/><circle cx="15" cy="15" r="6.3" fill="#2CCB5E"/><circle cx="15" cy="15" r="3.6" fill="${W}"/><circle cx="15" cy="15" r="1.6" fill="#2CCB5E"/>`),
    Health: svg(bg("#fff") + `<path d="M20.9 8.9a3.2 3.2 0 0 0-4.5 0l-.9.9-.9-.9a3.2 3.2 0 1 0-4.5 4.5l5.4 5.4 5.4-5.4a3.2 3.2 0 0 0 0-4.5z" fill="#FF2D55" transform="translate(-6.06 -3.09) scale(1.35)"/>`),
    Home: svg(bg("#fff") + `<path d="M15 7.2l-8.2 6.7h2.4v8.4h4.1v-5.1h3.4v5.1h4.1v-8.4h2.4z" fill="#FF9500"/>`),
    Mail: gtile("#21A0FF", "#0A6CF2", `<rect x="6.4" y="9.4" width="17.2" height="11.6" rx="2.2" fill="${W}"/><path d="M7.2 10.4l7.8 6 7.8-6" fill="none" stroke="#1784F5" stroke-width="1.4" stroke-linejoin="round"/>`),
    Maps: svg(bg("#F1EEE4") + `<path d="M0 7C0 3 3 0 7 0h9L0 16z" fill="#7ED36F"/><path d="M30 19v4c0 4-3 7-7 7h-6z" fill="#7ED36F"/><path d="M-1 24L31 7" stroke="#fff" stroke-width="5"/><path d="M-1 24L31 7" stroke="#FFC93C" stroke-width="1.2"/><circle cx="19" cy="17.5" r="3.4" fill="#0A84FF" stroke="#fff" stroke-width="1.6"/>`),
    Messages: gtile("#5BF675", "#0CBD2A", `<ellipse cx="15" cy="14.2" rx="8.6" ry="7.1" fill="${W}"/><path d="M9.6 18.6c-.2 1.8-1 3.1-2.4 3.9 2.3 0 3.9-.7 5-1.9z" fill="${W}"/>`),
    Music: gtile("#FF6476", "#FA233B", `<path d="M19.4 7.6v10.6a2.6 2.3 0 1 1-1.6-2.1v-5.2l-5.4 1.2v7.7a2.6 2.3 0 1 1-1.6-2.1V9.3z" fill="${W}"/>`),
    Phone: gtile("#5BF675", "#0CBD2A", `<path d="M11.2 7.9c.6-.3 1.3-.1 1.6.5l1.2 2.4c.3.6.1 1.2-.4 1.6l-1 .7c.6 1.6 1.8 2.9 3.4 3.5l.7-1c.4-.5 1-.7 1.6-.4l2.4 1.2c.6.3.8 1 .5 1.6l-.7 1.4c-.4.8-1.3 1.2-2.2 1-4.4-1-7.9-4.5-8.9-8.9-.2-.9.2-1.8 1-2.2z" fill="${W}"/>`),
    Photos: svg(bg("#fff") + petals(["#FF9F0A", "#FFD60A", "#8DD84A", "#34C3A0", "#2E9BF0", "#7D5BE6", "#E14FC0", "#FF453A"], 4.6, 2.7, 4.6, 0.82)),
    Podcasts: gtile("#D86CFB", "#842CC2", `<circle cx="15" cy="13.4" r="2.1" fill="${W}"/><path d="M11.3 17.8a5.4 5.4 0 1 1 7.4 0M9.1 20.3a8.6 8.6 0 1 1 11.8 0" ${st(1.6)}/><rect x="13.9" y="16.2" width="2.2" height="6.4" rx="1.1" fill="${W}"/>`),
    Reminders: svg(bg("#fff") + [["#0A84FF", 9.6], ["#FF3B30", 15], ["#FF9500", 20.4]].map(([c, y]) =>
      `<circle cx="9.6" cy="${y}" r="2" fill="none" stroke="${c}" stroke-width="1.3"/><circle cx="9.6" cy="${y}" r="1.1" fill="${c}"/><path d="M13.6 ${y}h9" stroke="#D1D1D6" stroke-width="1.2" stroke-linecap="round"/>`).join("")),
    Wallet: svg(bg("#000") + `<rect x="6" y="7.6" width="18" height="10" rx="2" fill="#2EB0F5"/><rect x="6" y="10" width="18" height="10" rx="2" fill="#34C759"/><rect x="6" y="12.4" width="18" height="10" rx="2" fill="#FFCC00"/><rect x="6" y="14.8" width="18" height="10" rx="2" fill="#FF6B57"/><path d="M6 17.4h5.2c.6 2 2 3 3.8 3s3.2-1 3.8-3H24v4.6c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2z" fill="#3A3A3C"/>`),
    Weather: gtile("#1E8EF5", "#62BCFF", `<circle cx="18.4" cy="11.4" r="4.2" fill="#FFD60A"/><path d="M10.4 21.4h9.2a3.3 3.3 0 0 0 .3-6.6 4.5 4.5 0 0 0-8.6.9 2.9 2.9 0 0 0-.9 5.7z" fill="${W}"/>`),
  };

  /* little phone glyphs for the Alerts and Display As pickers, 28×50 */
  const ph = (inner, on = true) => {
    const c = on ? "#0A84FF" : "#8E8E93";
    return `<svg width="28" height="50" viewBox="0 0 28 50" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="26" height="48" rx="6" fill="#fff" stroke="${c}" stroke-width="2"/><rect x="10" y="3.6" width="8" height="2.2" rx="1.1" fill="${c}"/>${inner.replaceAll("C", c)}</svg>`;
  };
  const P = {
    lock: ph(`<rect x="4.5" y="38" width="19" height="6" rx="2" fill="C"/>`),
    center: ph(`<rect x="4.5" y="9" width="19" height="5" rx="1.8" fill="C" opacity=".55"/><rect x="4.5" y="16" width="19" height="5" rx="1.8" fill="C" opacity=".55"/><rect x="4.5" y="23" width="19" height="5" rx="1.8" fill="C"/><rect x="4.5" y="30" width="19" height="5" rx="1.8" fill="C" opacity=".55"/><rect x="4.5" y="37" width="19" height="5" rx="1.8" fill="C" opacity=".55"/>`),
    banner: ph(`<rect x="4.5" y="8.6" width="19" height="6" rx="2" fill="C"/>`),
    count: ph(`<rect x="9" y="41" width="10" height="3.4" rx="1.7" fill="C"/>`, false),
    stack: ph(`<rect x="6" y="36.5" width="16" height="2.4" rx="1.2" fill="C" opacity=".5"/><rect x="4.5" y="39" width="19" height="6" rx="2" fill="C"/>`),
    list: ph(`<rect x="4.5" y="23" width="19" height="5" rx="1.8" fill="C"/><rect x="4.5" y="30" width="19" height="5" rx="1.8" fill="C"/><rect x="4.5" y="37" width="19" height="5" rx="1.8" fill="C"/>`, false),
  };
  const check = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#0A84FF"/><path d="M6.6 11.3l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const crit = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><path d="M11 3.2L20.2 19H1.8z" fill="#FF3B30" stroke="#FF3B30" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 8.6v5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle cx="11" cy="16.2" r="1.1" fill="#fff"/></svg>`;
  const ts = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="7.6" fill="#FFCC00"/><path d="M11 7v4.4l2.6 1.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`;

  window.SETTINGS_ICONS = { T, A, P, check, crit, ts };
})();
