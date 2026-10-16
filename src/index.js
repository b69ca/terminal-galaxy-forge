const tau = Math.PI * 2;
export function createWorld({ seed = 42, width = 80, height = 36, stars = 1800, arms = 3, tilt = 45 } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('seed must be unsigned 32-bit');
  if (!Number.isInteger(width) || width < 20 || width > 120 || !Number.isInteger(height) || height < 10 || height > 60) throw new Error('width must be 20–120 and height 10–60');
  if (!Number.isInteger(stars) || stars < 100 || stars > 5000) throw new Error('stars must be 100–5000');
  if (!Number.isInteger(arms) || arms < 1 || arms > 6 || !Number.isFinite(tilt) || tilt < 0 || tilt > 80) throw new Error('arms must be 1–6 and tilt 0–80 degrees');
  let state = seed; const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const particles = Array.from({ length: stars }, () => {
    const r = 0.08 + Math.pow(random(), 0.75) * 3.85, arm = Math.floor(random() * arms), bulge = random() < 0.18;
    const phase = bulge ? random() * tau : arm * tau / arms + Math.log(r + 0.2) * 2.5 + (random() - 0.5) * 0.7;
    return { radius: bulge ? r * 0.35 : r, phase, z: (random() - 0.5) * (bulge ? 0.7 : 0.18), brightness: 0.3 + random() * 0.7, bulge };
  });
  return { seed, width, height, stars, arms, tilt, frame: 0, particles };
}
export function step(world, count = 1) {
  if (!Number.isInteger(count) || count < 0 || count > 10000) throw new Error('step count must be 0–10000');
  for (let n = 0; n < count; n++) { for (const p of world.particles) p.phase = (p.phase + 0.012 / Math.pow(p.radius + 0.4, 0.8)) % tau; world.frame++; } return world;
}
export function project(world, p) {
  const angle = world.tilt * Math.PI / 180; return { x: p.radius * Math.cos(p.phase), y: p.radius * Math.sin(p.phase) * Math.cos(angle) + p.z * Math.sin(angle) };
}
export function analyze(world) { return { seed: world.seed, frame: world.frame, width: world.width, height: world.height, stars: world.stars, arms: world.arms, tilt: world.tilt, meanRadius: world.particles.reduce((sum, p) => sum + p.radius, 0) / world.stars, bulgeStars: world.particles.filter(p => p.bulge).length }; }
export function render(world, { color = false } = {}) {
  const { width: w, height: h } = world, density = new Float64Array(w * h);
  for (const p of world.particles) { const q = project(world, p), x = Math.round((q.x / 8.4 + 0.5) * (w - 1)), y = Math.round((q.y / 8.4 + 0.5) * (h - 1)); if (x >= 0 && x < w && y >= 0 && y < h) density[y * w + x] += p.brightness; }
  const rows = [], ramp = ' .:*oO#@'; for (let y = 0; y < h; y++) { let row = ''; for (let x = 0; x < w; x++) { const d = density[y * w + x], ch = ramp[Math.min(7, Math.ceil(d * 1.5))]; row += color && d ? `\x1b[${d > 2 ? 93 : d > 0.8 ? 97 : 94}m${ch}\x1b[0m` : ch; } rows.push(row); } return rows.join('\n');
}
export function renderSVG(world) {
  const dots = world.particles.map(p => { const q = project(world, p); return `<circle cx="${(400 + q.x * 62).toFixed(2)}" cy="${(350 + q.y * 62).toFixed(2)}" r="${(p.brightness * 1.3).toFixed(2)}" opacity="${p.brightness.toFixed(2)}" fill="${p.bulge ? '#ffd9a0' : '#9acaff'}"/>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="650" viewBox="0 0 800 650"><defs><radialGradient id="glow"><stop stop-color="#f1bc74" stop-opacity="0.24"/><stop offset="1" stop-color="#0d1525" stop-opacity="0"/></radialGradient></defs><rect width="800" height="650" rx="18" fill="#0d1525"/><ellipse cx="400" cy="350" rx="160" ry="100" fill="url(#glow)"/>${dots}<g font-family="monospace"><text x="32" y="38" font-size="24" fill="#eff5ff">TERMINAL GALAXY FORGE</text><text x="32" y="64" fill="#93a4bc">seed ${world.seed} / ${world.stars} stars / ${world.arms} arms / tilt ${world.tilt}° / frame ${world.frame}</text><text x="32" y="628" font-size="13" fill="#93a4bc">Procedural spiral art / [ ] tilt / p pause . step n seed r reset q quit</text></g></svg>\n`;
}
