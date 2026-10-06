/* Codex Bookmarks poster lab: shared shapes. Every helper returns SVG markup,
   so a variation file is only composition. Poster space is 1080 x 1350. */
(function () {
  const f = (n) => Math.round(n * 10) / 10;
  const P = (x, y) => `${f(x)} ${f(y)}`;

  /* --- palette ---------------------------------------------------------- */
  const C = {
    ink: '#2A36E4',        // deep Codex blue for type on light grounds
    blue: '#4552F6',
    cloudTop: '#A9A6FF', cloudMid: '#5C67FF', cloudBot: '#3B45EE',
    cloudShade: '#2228B8', cloudGlow: '#E6E3FF',
    face: '#F6F5FF',
    pink: '#FF5FA6', pinkLite: '#FF8CC1', pinkDeep: '#E23E8A',
    blush: '#FF8DC3',
    // the product's own bookmark colours (from the colour picker in the loop)
    tag: { blue: '#3E80F7', purple: '#A77BF3', pink: '#F2609F', yellow: '#F4BA36', green: '#4DB862', grey: '#727272' },
  };

  /* --- lobed outline: circles listed clockwise, valleys filleted -------- */
  function meet(A, B) {
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
    const a = (A.r * A.r - B.r * B.r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, A.r * A.r - a * a));
    const mx = A.x + (a * dx) / d, my = A.y + (a * dy) / d;
    return [{ x: mx + (h * dy) / d, y: my - (h * dx) / d }, { x: mx - (h * dy) / d, y: my + (h * dx) / d }];
  }
  function lobes(L, rf = 12) {
    const n = L.length;
    const cx = L.reduce((s, c) => s + c.x, 0) / n, cy = L.reduce((s, c) => s + c.y, 0) / n;
    const far = (ps) => ps.sort((p, q) => Math.hypot(q.x - cx, q.y - cy) - Math.hypot(p.x - cx, p.y - cy))[0];
    const J = [];
    for (let i = 0; i < n; i++) {
      const A = L[i], B = L[(i + 1) % n];
      const F = far(meet({ x: A.x, y: A.y, r: A.r + rf }, { x: B.x, y: B.y, r: B.r + rf }));
      J.push({
        ta: { x: A.x + ((F.x - A.x) * A.r) / (A.r + rf), y: A.y + ((F.y - A.y) * A.r) / (A.r + rf) },
        tb: { x: B.x + ((F.x - B.x) * B.r) / (B.r + rf), y: B.y + ((F.y - B.y) * B.r) / (B.r + rf) },
      });
    }
    let d = `M${P(J[n - 1].tb.x, J[n - 1].tb.y)}`;
    for (let i = 0; i < n; i++) {
      const c = L[i], a = J[(i - 1 + n) % n].tb, b = J[i].ta;
      let t = Math.atan2(b.y - c.y, b.x - c.x) - Math.atan2(a.y - c.y, a.x - c.x);
      while (t < 0) t += 2 * Math.PI;
      d += ` A${f(c.r)} ${f(c.r)} 0 ${t > Math.PI ? 1 : 0} 1 ${P(b.x, b.y)}`;
      d += ` A${rf} ${rf} 0 0 0 ${P(J[i].tb.x, J[i].tb.y)}`;
    }
    return d + 'Z';
  }

  // The Codex cloud, roughly 472 x 420 at scale 1, centred on 0,0.
  const CLOUD = [
    { x: -78, y: -92, r: 88 }, { x: 48, y: -104, r: 104 }, { x: 150, y: -8, r: 84 },
    { x: 108, y: 98, r: 86 }, { x: -4, y: 128, r: 84 }, { x: -112, y: 92, r: 80 }, { x: -160, y: -6, r: 78 },
  ];
  const cloudD = (rf = 14) => lobes(CLOUD, rf);

  /* --- defs ------------------------------------------------------------- */
  // Puffy fill: vertical gradient + inner shade at the bottom + inner glow at the top.
  function puffy(id, { top, mid, bot, shade, glow, sd = 18, gd = 12, so = 0.5, go = 0.8 }) {
    return `
    <linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${bot}"/></linearGradient>
    <filter id="${id}-f" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
      <feComponentTransfer in="SourceAlpha" result="inv"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer>
      <feGaussianBlur in="inv" stdDeviation="${sd}" result="b1"/><feOffset in="b1" dy="${-sd}" result="o1"/>
      <feFlood flood-color="${shade}" flood-opacity="${so}"/><feComposite in2="o1" operator="in"/>
      <feComposite in2="SourceAlpha" operator="in" result="sh"/>
      <feGaussianBlur in="inv" stdDeviation="${gd * 0.7}" result="b2"/><feOffset in="b2" dy="${gd}" result="o2"/>
      <feFlood flood-color="${glow}" flood-opacity="${go}"/><feComposite in2="o2" operator="in"/>
      <feComposite in2="SourceAlpha" operator="in" result="hi"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="sh"/><feMergeNode in="hi"/></feMerge>
    </filter>`;
  }
  const shadow = (id, { dy = 22, blur = 22, color = '#2A36E4', op = 0.22 } = {}) => `
    <filter id="${id}" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="${color}" flood-opacity="${op}"/></filter>`;
  const soft = (id, s) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s}"/></filter>`;

  /* --- mascot ----------------------------------------------------------- */
  // The Codex cloud as a character: >_ face, blush, a glossy wink of light.
  function mascotDefs(id = 'm') {
    return puffy(id, { top: C.cloudTop, mid: C.cloudMid, bot: C.cloudBot, shade: C.cloudShade, glow: C.cloudGlow, sd: 22, gd: 14, so: 0.45, go: 0.75 })
      + soft(`${id}-blur6`, 6) + soft(`${id}-blur12`, 12);
  }
  function face(id = 'm', { blush = true, w = 30 } = {}) {
    return `
    ${blush ? `<g data-name="Blush" filter="url(#${id}-blur6)" fill="${C.blush}" opacity=".85">
      <ellipse cx="-142" cy="58" rx="30" ry="17"/><ellipse cx="142" cy="58" rx="30" ry="17"/></g>` : ''}
    <g data-name="Face" fill="none" stroke="${C.face}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M-92 -50 L-40 0 L-92 50"/><path d="M-4 50 H84"/></g>`;
  }
  function gloss() {
    return `<g data-name="Gloss" fill="#fff">
      <ellipse cx="-118" cy="-112" rx="34" ry="17" transform="rotate(-34 -118 -112)" opacity=".85"/>
      <circle cx="-74" cy="-142" r="8" opacity=".85"/></g>`;
  }
  function mascot(id = 'm', { x = 540, y = 800, s = 1, blush = true, sticker = 0, stickerColor = '#fff', faceW = 30 } = {}) {
    const d = cloudD();
    return `<g data-name="Mascot" transform="translate(${x} ${y}) scale(${s})">
      ${sticker ? `<path d="${d}" fill="${stickerColor}" stroke="${stickerColor}" stroke-width="${sticker * 2}" stroke-linejoin="round"/>` : ''}
      <path data-name="Cloud body" d="${d}" fill="url(#${id}-g)" filter="url(#${id}-f)"/>
      ${gloss()}
      ${face(id, { blush, w: faceW })}
    </g>`;
  }

  /* --- type ------------------------------------------------------------- */
  // OpenAI Sans tops out at Medium on this machine; a round-joined stroke in the
  // fill colour gives a clean semibold without the miter spikes of text-stroke.
  function title(lines, { x = 540, y, size = 112, lh = 1, fill = C.ink, bold = 5, track = -0.02, extra = '' } = {}) {
    return `<g data-name="Title">` + lines.map((t, i) => `<text data-name="Title · ${t}" x="${f(x - (track * size) / 2)}" y="${f(y + i * size * lh)}" text-anchor="middle"
      font-family="OpenAI Sans" font-weight="500" font-size="${size}" letter-spacing="${f(track * size)}"
      fill="${fill}" stroke="${fill}" stroke-width="${bold}" stroke-linejoin="round" paint-order="stroke" ${extra}>${t}</text>`).join('') + '</g>';
  }

  /* --- grounds ---------------------------------------------------------- */
  function sunburst(cx, cy, n, a, b, R = 1400) {
    let s = `<rect data-name="Ground" width="1080" height="1350" fill="${a}"/><g data-name="Sunburst">`;
    for (let i = 0; i < n; i++) {
      const t0 = (i / n) * 2 * Math.PI, t1 = ((i + 0.5) / n) * 2 * Math.PI;
      s += `<path d="M${P(cx, cy)} L${P(cx + R * Math.cos(t0), cy + R * Math.sin(t0))} L${P(cx + R * Math.cos(t1), cy + R * Math.sin(t1))}Z" fill="${b}"/>`;
    }
    return s + '</g>';
  }
  function gingham(id, base, ink, cell = 60, op = 0.5) {
    return `<pattern id="${id}" width="${cell * 2}" height="${cell * 2}" patternUnits="userSpaceOnUse">
      <rect width="${cell * 2}" height="${cell * 2}" fill="${base}"/>
      <rect width="${cell}" height="${cell * 2}" fill="${ink}" opacity="${op}"/>
      <rect width="${cell * 2}" height="${cell}" fill="${ink}" opacity="${op}"/></pattern>`;
  }
  function dotgrid(id, base, ink, gap = 36, r = 2.4) {
    return `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse">
      <rect width="${gap}" height="${gap}" fill="${base}"/><circle cx="${gap / 2}" cy="${gap / 2}" r="${r}" fill="${ink}"/></pattern>`;
  }

  /* --- bubbles ---------------------------------------------------------- */
  function bubble(x, y, w, h, { fill = '#fff', r = 34, lines = 2, lineCol = '#DCE3FF', tail = 0 } = {}) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
    const pad = 38, lh = 30;
    for (let i = 0; i < lines; i++) {
      const lw = i === lines - 1 ? (w - pad * 2) * 0.62 : w - pad * 2;
      s += `<rect x="${x + pad}" y="${y + pad + i * lh}" width="${f(lw)}" height="14" rx="7" fill="${lineCol}"/>`;
    }
    return s;
  }

  window.CX = { C, f, P, lobes, CLOUD, cloudD, puffy, shadow, soft, mascotDefs, face, gloss, mascot, title, sunburst, gingham, dotgrid, bubble };
})();

/* --- bookmarks ---------------------------------------------------------- */
(function () {
  const { f, P, C, puffy } = CX;
  const pinkDefs = (id = 'pk') => puffy(id, { top: '#FF9CCB', mid: C.pink, bot: '#F2448F', shade: '#C2276F', glow: '#FFD3E7', sd: 14, gd: 10, so: 0.45, go: 0.8 });
  // A stitched card bookmark with a punched hole, a cord and a tassel.
  function tasselCard(id, { x, y, w = 180, h = 440, r = 30, tassel = C.blue, rot = 0 } = {}) {
    const hx = x, hy = y - h / 2 + 62;
    const heart = (cx, cy, s) => `<path transform="translate(${cx} ${cy}) scale(${s})" d="M0 9 C-14 -2 -22 -8 -22 -16 C-22 -24 -15 -29 -9 -29 C-4 -29 -1 -26 0 -23 C1 -26 4 -29 9 -29 C15 -29 22 -24 22 -16 C22 -8 14 -2 0 9Z" fill="#fff"/>`;
    return `<g transform="rotate(${rot} ${x} ${y})">
      <mask id="${id}-hole"><rect x="${x - w}" y="${y - h}" width="${w * 2}" height="${h * 2}" fill="#fff"/><circle cx="${hx}" cy="${hy}" r="17" fill="#000"/></mask>
      <g mask="url(#${id}-hole)">
        <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${r}" fill="url(#${id}-g)" filter="url(#${id}-f)"/>
        <rect x="${x - w / 2 + 16}" y="${y - h / 2 + 16}" width="${w - 32}" height="${h - 32}" rx="${r - 12}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="5" stroke-dasharray="1 15" stroke-linecap="round"/>
        ${heart(hx, hy + 110, 1.5)}
      </g>
      <!-- cord through the hole, then a tassel -->
      <path d="M${P(hx, hy)} C${P(hx - 6, hy - 70)} ${P(hx + 70, hy - 110)} ${P(hx + 96, hy - 60)}" fill="none" stroke="${tassel}" stroke-width="9" stroke-linecap="round"/>
      <g transform="translate(${hx + 96} ${hy - 60}) rotate(-16)">
        <rect x="-15" y="0" width="30" height="24" rx="10" fill="${tassel}"/>
        <path d="M-14 20 L-20 92 Q0 100 20 92 L14 20Z" fill="${tassel}"/>
        <g stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"><path d="M-7 34 L-10 88"/><path d="M0 34 V90"/><path d="M7 34 L10 88"/></g>
      </g>
    </g>`;
  }
  Object.assign(CX, { pinkDefs, tasselCard });
})();

/* --- more bookmarks, props and grounds ---------------------------------- */
(function () {
  const { f, P, C, puffy, lobes } = CX;
  const whiteDefs = (id = 'wh') => puffy(id, { top: '#FFFFFF', mid: '#F7F8FF', bot: '#E3E9FF', shade: '#9FB0FF', glow: '#FFFFFF', sd: 16, gd: 8, so: 0.55, go: 0.9 });
  const tagDefs = () => Object.entries(C.tag).map(([k, v]) => `<linearGradient id="tg-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${v}" stop-opacity=".82"/><stop offset="1" stop-color="${v}"/></linearGradient>`).join('');

  // A strip from s to e, width w, end cut with a V notch (the bookmark's own tail).
  function tail(s, e, w, notch = 0.45) {
    const dx = e.x - s.x, dy = e.y - s.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, h = w / 2;
    const A = [s.x + nx * h, s.y + ny * h], B = [s.x - nx * h, s.y - ny * h], Cc = [e.x - nx * h, e.y - ny * h], D = [e.x + nx * h, e.y + ny * h];
    const N = [e.x - ux * w * notch, e.y - uy * w * notch];
    return `M${P(...A)} L${P(...D)} L${P(...N)} L${P(...Cc)} L${P(...B)}Z`;
  }

  // Pink bow; its tails end in the bookmark's V notch.
  function bow(id, { x, y, s = 1, rot = 0 } = {}) {
    const loop = (m) => `M${m * 16} -12 C${m * 60} -86 ${m * 168} -96 ${m * 170} -16 C${m * 172} 52 ${m * 74} 46 ${m * 16} 14Z`;
    const fold = (m) => `M${m * 22} -6 C${m * 52} -30 ${m * 92} -34 ${m * 104} -8 C${m * 84} -2 ${m * 56} 6 ${m * 22} 10Z`;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
      <path d="${tail({ x: -10, y: 8 }, { x: -78, y: 150 }, 58)}" fill="url(#${id}-g)" filter="url(#${id}-f)"/>
      <path d="${tail({ x: 10, y: 8 }, { x: 70, y: 158 }, 58)}" fill="url(#${id}-g)" filter="url(#${id}-f)"/>
      <path d="${loop(-1)}" fill="url(#${id}-g)" filter="url(#${id}-f)"/>
      <path d="${loop(1)}" fill="url(#${id}-g)" filter="url(#${id}-f)"/>
      <path d="${fold(-1)}" fill="${C.pinkDeep}" opacity=".45"/><path d="${fold(1)}" fill="${C.pinkDeep}" opacity=".45"/>
      <rect x="-30" y="-32" width="60" height="62" rx="22" fill="url(#${id}-g)" filter="url(#${id}-f)"/>
      <ellipse cx="-118" cy="-46" rx="20" ry="9" transform="rotate(-28 -118 -46)" fill="#fff" opacity=".8"/>
    </g>`;
  }

  // A bookmark turned into a pennant: the same V-notched strip, flying on a pole.
  function pennant(id, { x, y, h = 330, fw = 230, fh = 132, pole = '#fff', knob = C.tag.yellow, shine = true } = {}) {
    const top = y - h, t = top + 18;
    const flag = `M${x + 6} ${t} C${x + fw * 0.35} ${t - 22} ${x + fw * 0.6} ${t + 18} ${x + fw} ${t - 6}
      L${x + fw - fh * 0.42} ${t - 6 + fh / 2} L${x + fw} ${t - 6 + fh}
      C${x + fw * 0.6} ${t + fh + 22} ${x + fw * 0.35} ${t + fh - 18} ${x + 6} ${t + fh}Z`;
    return `<g data-name="Flag pole"><rect data-name="Pole" x="${x - 9}" y="${top}" width="18" height="${h}" rx="9" fill="${pole}"/>
      <rect x="${x - 9}" y="${top}" width="7" height="${h}" rx="3.5" fill="#C9D3FF" opacity=".7"/>
      <path data-name="Flag" d="${flag}" fill="url(#${id}-g)" filter="url(#${id}-f)"/>
      ${shine ? `<path d="M${x + 40} ${t + 34} C${x + 80} ${t + 22} ${x + 110} ${t + 34} ${x + 140} ${t + 26}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="10" stroke-linecap="round"/>` : ''}
      <circle data-name="Knob" cx="${x}" cy="${top - 4}" r="20" fill="${knob}"/><circle data-name="Knob shine" cx="${x - 6}" cy="${top - 10}" r="6" fill="#fff" opacity=".75"/></g>`;
  }

  // Sticky page flags in the product's bookmark colours.
  function tabs(list, { x, len = 150, h = 58, r = 16 } = {}) {
    return list.map(({ y, c, dx = 0, rot = 0, l = len }) => `<g transform="rotate(${rot} ${x + dx} ${y})">
      <rect x="${x + dx - 40}" y="${y - h / 2}" width="${l + 40}" height="${h}" rx="${r}" fill="url(#tg-${c})"/>
      <rect x="${x + dx + l - 44}" y="${y - h / 2 + 10}" width="26" height="10" rx="5" fill="#fff" opacity=".55"/></g>`).join('');
  }

  // A satin ribbon along a polyline-ish centreline (sampled cubic), swallowtail end.
  function ribbonPath(pts, w, notch = 0.5) {
    const L = [], R = [], h = w / 2;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), nx = -dy / d, ny = dx / d;
      L.push([pts[i].x + nx * h, pts[i].y + ny * h]); R.push([pts[i].x - nx * h, pts[i].y - ny * h]);
    }
    const e = pts[pts.length - 1], p = pts[pts.length - 2], d = Math.hypot(e.x - p.x, e.y - p.y);
    const N = [e.x - ((e.x - p.x) / d) * w * notch, e.y - ((e.y - p.y) / d) * w * notch];
    return 'M' + L.map((q) => P(...q)).join(' L') + ` L${P(...N)} L` + R.reverse().map((q) => P(...q)).join(' L') + 'Z';
  }
  function cubic(p0, p1, p2, p3, n = 40) {
    const o = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      o.push({ x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y });
    }
    return o;
  }

  // Plain white sky clouds from lobes.
  function skyCloud(x, y, s, id = 'wh', circles) {
    const L = circles || [{ x: -150, y: 20, r: 60 }, { x: -70, y: -40, r: 80 }, { x: 40, y: -60, r: 96 }, { x: 140, y: 0, r: 72 }, { x: 60, y: 60, r: 60 }, { x: -60, y: 64, r: 60 }];
    return `<path data-name="Sky cloud" d="${lobes(L, 10)}" transform="translate(${x} ${y}) scale(${s})" fill="url(#${id}-g)" filter="url(#${id}-f)"/>`;
  }

  // Tone-on-tone wallpaper of tiny clouds and tiny bookmarks.
  function wallpaper(id, base, ink, cell = 150) {
    const cd = CX.cloudD(16);
    return `<pattern id="${id}" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse">
      <rect width="${cell}" height="${cell}" fill="${base}"/>
      <path d="${cd}" transform="translate(${cell * 0.25} ${cell * 0.27}) scale(.085)" fill="${ink}"/>
      <path d="M${cell * 0.7} ${cell * 0.6} h22 v32 l-11 -9 l-11 9z" fill="${ink}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>
    </pattern>`;
  }

  Object.assign(CX, { whiteDefs, tagDefs, tail, bow, pennant, tabs, ribbonPath, cubic, skyCloud, wallpaper });
})();

/* --- die-cut sticker edge: blur + threshold grows a round border ---------- */
(function () {
  function sticker(id, { r = 14, color = '#fff', dy = 20, blur = 20, scol = CX.C.ink, sop = 0.2 } = {}) {
    return `<filter id="${id}" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1280" height="1550" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${(r / 1.645).toFixed(2)}" result="b"/>
      <feComponentTransfer in="b" result="d"><feFuncA type="linear" slope="30" intercept="-1.5"/></feComponentTransfer>
      <feFlood flood-color="${color}"/><feComposite in2="d" operator="in" result="w"/>
      <feGaussianBlur in="d" stdDeviation="${blur}"/><feOffset dy="${dy}" result="so"/>
      <feFlood flood-color="${scol}" flood-opacity="${sop}"/><feComposite in2="so" operator="in" result="s"/>
      <feMerge><feMergeNode in="s"/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
  }
  Object.assign(CX, { sticker });
})();

/* --- sticky page flags, v2: film body + solid tip ------------------------- */
(function () {
  const { C, f } = CX;
  // dir: 'r' sticks out to the right, 'u' sticks out upward. (x,y) is where it leaves the edge.
  function flag({ x, y, c, len = 120, h = 54, dir = 'r', rot = 0 }) {
    const col = C.tag[c], tip = len * 0.46;
    const body = `<rect x="-60" y="${-h / 2}" width="${len + 60}" height="${h}" rx="10" fill="${col}" opacity=".5"/>
      <rect x="${len - tip}" y="${-h / 2}" width="${tip}" height="${h}" rx="10" fill="${col}"/>
      <rect x="${len - tip}" y="${-h / 2}" width="10" height="${h}" fill="${col}"/>
      <rect x="${len - tip + 12}" y="${-h / 2 + 9}" width="${tip - 30}" height="9" rx="4.5" fill="#fff" opacity=".45"/>`;
    const a = dir === 'u' ? -90 : 0;
    return `<g data-name="Tab · ${c}" transform="translate(${x} ${y}) rotate(${a + rot})">${body}</g>`;
  }
  // A white stationery label with the title on it.
  function label({ x = 540, y, w, h, r = 28 }) {
    return `<rect data-name="Label" x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff"/>
      <rect x="${x - w / 2 + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" rx="${r - 10}" data-name="Label stitch" fill="none" stroke="${C.tag.blue}" stroke-opacity=".45" stroke-width="4" stroke-dasharray="1 13" stroke-linecap="round"/>`;
  }
  Object.assign(CX, { flag, label });
})();
