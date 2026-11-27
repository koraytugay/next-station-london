// Card artwork (inline SVG strings). Pure functions of a card, no game logic.
(() => {
  const NAVY = '#1b1750';

  const ICON = {
    circle: `<circle cx="50" cy="50" r="30" fill="${NAVY}"/>`,
    triangle: `<polygon points="50,16 86,80 14,80" fill="${NAVY}" stroke="${NAVY}" stroke-width="4" stroke-linejoin="round"/>`,
    square: `<rect x="22" y="22" width="56" height="56" rx="4" fill="${NAVY}"/>`,
    pentagon: `<polygon points="50,14 86,40 72,84 28,84 14,40" fill="${NAVY}" stroke="${NAVY}" stroke-width="4" stroke-linejoin="round"/>`,
    joker: `<path d="M40 8h20v32h32v20H60v32H40V60H8V40h32z" fill="#ffd23a" stroke="${NAVY}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="22" cy="22" r="9" fill="${NAVY}"/><polygon points="78,13 88,31 68,31" fill="${NAVY}"/>
      <polygon points="22,69 31,76 28,87 16,87 13,76" fill="${NAVY}"/><rect x="69" y="69" width="18" height="18" rx="2" fill="${NAVY}"/>`,
    switch: `<rect width="100" height="100" fill="${NAVY}"/>
      <path d="M22 86 L38 14" stroke="#e0457b" stroke-width="9" stroke-linecap="round" fill="none"/>
      <path d="M42 86 L58 14" stroke="#ffe94a" stroke-width="9" stroke-linecap="round" fill="none"/>
      <path d="M62 86 L78 14" stroke="#e0457b" stroke-width="9" stroke-linecap="round" fill="none"/>
      <circle cx="80" cy="78" r="13" fill="#4aa8e8" stroke="#fff" stroke-width="3"/><path d="M80 70v16M72 78h16" stroke="#fff" stroke-width="3"/>`,
  };
  const PINK = '#e0457b', YEL = '#ffe94a', SKY = '#8ccbf0', CREAM = '#fff8e6';

  // little commuter: head + body
  const fig = (x, y, c) => `<circle cx="${x}" cy="${y}" r="5" fill="${NAVY}"/><rect x="${x - 5}" y="${y + 6}" width="10" height="20" rx="5" fill="${c}"/>`;
  const W = 'fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"';
  const spokes = (cx, cy, r, n) => Array.from({ length: n }, (_, i) => { const t = i * 2 * Math.PI / n; return `<line x1="${cx}" y1="${cy}" x2="${(cx + r * Math.cos(t)).toFixed(1)}" y2="${(cy + r * Math.sin(t)).toFixed(1)}"/>`; }).join('');
  const tree = (x) => `<circle cx="${x}" cy="168" r="11" fill="#58b368"/><rect x="${x - 2}" y="176" width="4" height="10" fill="${NAVY}"/>`;
  const bus = (x, c) => `<rect x="${x}" y="156" width="64" height="28" rx="5" fill="${c}"/><g fill="#fff"><rect x="${x + 6}" y="162" width="11" height="9" rx="1"/><rect x="${x + 21}" y="162" width="11" height="9" rx="1"/><rect x="${x + 36}" y="162" width="11" height="9" rx="1"/><rect x="${x + 51}" y="162" width="9" height="9" rx="1"/></g><circle cx="${x + 14}" cy="185" r="6" fill="${NAVY}"/><circle cx="${x + 50}" cy="185" r="6" fill="${NAVY}"/>`;

  const LANDMARK = {
    circle: `<g ${W}><rect x="196" y="62" width="26" height="123"/><polygon points="194,62 209,30 224,62"/><circle cx="209" cy="80" r="7"/><line x1="209" y1="30" x2="209" y2="16"/><rect x="232" y="138" width="62" height="47"/><path d="M242 138v47M254 138v47M266 138v47M278 138v47"/></g>`,
    triangle: `<g ${W}><rect x="150" y="92" width="22" height="93"/><polygon points="148,92 161,62 174,92"/><rect x="214" y="92" width="22" height="93"/><polygon points="212,92 225,62 238,92"/><rect x="172" y="122" width="42" height="63"/><circle cx="193" cy="138" r="8"/><path d="M110 185V150h40M236 150h50v35"/></g>`,
    square: `<g ${W}><polygon points="206,185 222,34 238,185"/><path d="M222 34v-14"/><path d="M150 185V120q0-52 22-52t22 52v65"/><path d="M150 100h44M150 125h44M150 150h44"/><rect x="250" y="120" width="40" height="65"/></g>`,
    pentagon: `<g ${W}><rect x="150" y="80" width="26" height="105"/><polygon points="148,80 163,52 178,80"/><rect x="240" y="80" width="26" height="105"/><polygon points="238,80 253,52 268,80"/><path d="M176 100h64M176 112h64"/><path d="M110 150h40M266 150h30"/><path d="M176 150q32 38 64 0"/></g>`,
    joker: `<g ${W}><circle cx="215" cy="100" r="66"/><circle cx="215" cy="100" r="58"/><g stroke-width="1.5">${spokes(215, 100, 58, 14)}</g><polygon points="215,100 185,185 245,185"/></g><g fill="#fff">${[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(i => { const t = i * 2 * Math.PI / 14; return `<circle cx="${(215 + 66 * Math.cos(t)).toFixed(1)}" cy="${(100 + 66 * Math.sin(t)).toFixed(1)}" r="3.5"/>`; }).join('')}</g>`,
    switch: `<g ${W}><rect x="150" y="90" width="22" height="95"/><polygon points="148,90 161,62 174,90"/><path d="M110 185v-30h40M172 130h50v55M222 120h60v65"/><circle cx="252" cy="96" r="10"/></g>`,
  };
  const balloon = `<g ${W} transform="translate(40 78)"><circle cx="0" cy="0" r="15"/><path d="M-10 12l6 14M10 12l-6 14"/><rect x="-7" y="26" width="14" height="8"/></g>`;
  const streetArt = (c) => `<rect width="200" height="280" fill="${SKY}"/><rect y="232" width="200" height="48" fill="#74bde8"/>
    <g ${W} opacity=".7"><path d="M18 40q10-8 22 0M150 30q8-6 18 0"/></g>${c.shape === 'joker' ? balloon : ''}
    <g transform="translate(-130 19.25) scale(1.15)">${LANDMARK[c.shape]}</g>
    <line x1="0" y1="232" x2="200" y2="232" stroke="#fff" stroke-width="3"/>
    <g transform="translate(0 82)">${tree(104)}${bus(120, c.shape === 'switch' ? YEL : PINK)}</g>`;

  const SCENE = {
    escalator: `<path d="M20 195L170 92v16L50 195z" fill="#fff"/><path d="M20 195L170 92" stroke="${NAVY}" stroke-width="3" fill="none"/><path d="M40 181L180 84" stroke="${NAVY}" stroke-width="3" fill="none"/>${fig(90, 112, NAVY)}${fig(130, 92, PINK)}${fig(215, 130, '#4aa8e8')}${fig(255, 128, PINK)}`,
    platform: `<g fill="#d8bd14"><rect x="40" y="82" width="10" height="106"/><rect x="150" y="82" width="10" height="106"/><rect x="262" y="82" width="10" height="106"/></g>${fig(70, 120, PINK)}${fig(96, 124, '#4aa8e8')}${fig(122, 118, NAVY)}${fig(190, 124, PINK)}${fig(216, 118, '#4aa8e8')}`,
    train: `<rect x="24" y="100" width="252" height="76" rx="20" fill="#fff" stroke="${NAVY}" stroke-width="3"/><rect x="24" y="126" width="252" height="12" fill="${PINK}"/><g fill="${NAVY}"><rect x="44" y="108" width="40" height="22" rx="5"/><rect x="100" y="108" width="40" height="22" rx="5"/><rect x="160" y="108" width="40" height="22" rx="5"/><rect x="216" y="108" width="40" height="22" rx="5"/></g><circle cx="70" cy="178" r="8" fill="${NAVY}"/><circle cx="230" cy="178" r="8" fill="${NAVY}"/>`,
  };
  const SCENE_FOR = { square: 'escalator', circle: 'platform', triangle: 'platform', pentagon: 'train', joker: 'train' };
  const undergroundArt = (c) => `<rect width="200" height="280" fill="${YEL}"/>
    <svg x="0" y="156" width="200" height="114" viewBox="20 80 240 120" preserveAspectRatio="xMidYMax meet">${SCENE[SCENE_FOR[c.shape]]}</svg>
    <rect y="270" width="200" height="10" fill="#d8bd14"/>
    <rect y="12" width="200" height="140" fill="${PINK}"/><rect y="6" width="200" height="7" fill="${NAVY}"/><rect y="150" width="200" height="7" fill="${NAVY}"/>`;

  // symbol in a white ring (or the switch tile)
  const badge = (c) => {
    const under = c.kind === 'underground';
    const [cx, cy, r] = under ? [100, 82, 48] : [56, 226, 36];
    if (c.shape === 'switch') {
      return `<g transform="translate(${cx - 32} ${cy - 32})"><rect width="64" height="64" rx="12" fill="${NAVY}" stroke="#fff" stroke-width="3"/><g transform="scale(.64)">${ICON.switch.replace(/<rect[^>]*>/, '')}</g></g>`;
    }
    const k = 0.76 * 2 * r / 100;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${CREAM}" stroke="${NAVY}" stroke-width="${under ? 7 : 6}"/><g transform="translate(${cx - 50 * k} ${cy - 50 * k}) scale(${k})">${ICON[c.shape]}</g>`;
  };
  const artCache = new Map();
  const drawCard = (c) => `<svg aria-hidden="true" viewBox="0 0 200 280" preserveAspectRatio="xMidYMid slice">${c.kind === 'street' ? streetArt(c) : undergroundArt(c)}${badge(c)}</svg>`;
  const artFor = (c) => {
    const key = `${c.kind}:${c.shape}`;
    if (!artCache.has(key)) artCache.set(key, drawCard(c));
    return artCache.get(key);
  };
  const ROUNDEL = '<svg aria-hidden="true" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fff8e6" stroke="#1b1750" stroke-width="5"/><circle cx="50" cy="50" r="31" fill="none" stroke="#e0457b" stroke-width="12"/><rect x="12" y="41" width="76" height="18" rx="2" fill="#1b1750"/></svg>';

  window.NSLArt = { ICON, artFor, ROUNDEL };
})();
