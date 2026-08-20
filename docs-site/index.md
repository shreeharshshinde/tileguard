---
layout: page
---

<style>
/* ─── Page background ──────────────────── */
.VPPage {
  background-color: #000000 !important;
  background-image: none !important;
}

.tg-docs {
  position: relative;
  max-width: 1100px;
  margin: 0 auto;
  padding: 4rem 1.5rem 0;
}

/* ─── Hidden Tubelight (Trapezoid Beam) ──── */
.tg-tubelight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 700px;
  pointer-events: none;
  z-index: 0;
}

.tg-tubelight::before {
  content: '';
  position: absolute;
  inset: 0;
  /* Bright center core fading realistically to ambient edges */
  background: linear-gradient(
    90deg,
    rgba(163, 255, 0, 0) 0%,
    rgba(163, 255, 0, 0.02) 20%,
    rgba(163, 255, 0, 0.15) 50%,
    rgba(163, 255, 0, 0.02) 80%,
    rgba(163, 255, 0, 0) 100%
  );
  /* Vertical fade out into darkness */
  -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
  /* Structural trapezoid bounds */
  clip-path: polygon(30% 0, 70% 0, 100% 100%, 0% 100%);
  /* Softens the outer boundaries for realism */
  filter: blur(12px);
}

.tg-tubelight::after {
  content: '';
  position: absolute;
  top: 0;
  left: 30%;
  right: 30%;
  height: 2px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 
    0 0 20px 5px rgba(163, 255, 0, 0.9),
    0 0 60px 15px rgba(163, 255, 0, 0.4);
}

/* ─── Hero ─────────────────────────────── */
.tg-hero {
  text-align: center;
  margin-bottom: 4rem;
}

.tg-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 100px;
  border: 1px solid rgba(163, 255, 0, 0.2);
  background: rgba(163, 255, 0, 0.04);
  font-size: 0.75rem;
  font-weight: 600;
  color: #a3ff00;
  letter-spacing: 0.02em;
  margin-bottom: 1.5rem;
}

.tg-hero h1 {
  font-size: 3.2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: #fff;
  margin: 0 0 1.2rem;
  border: none !important;
  padding: 0 !important;
}

.tg-hero h1 .accent {
  color: #a3ff00;
}

.tg-hero .subtitle {
  font-size: 1.15rem;
  color: #a1a1aa;
  max-width: 560px;
  margin: 0 auto 2rem;
  line-height: 1.7;
  font-weight: 400;
}

/* ─── Install snippet ───────────────────── */
.tg-install {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  margin: 0 auto 2rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  color: #d4d4d8;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  max-width: 360px;
}

.tg-install:hover {
  border-color: rgba(163, 255, 0, 0.3);
  background: rgba(163, 255, 0, 0.04);
}

.tg-install .pkg { color: #a1a1aa; }
.tg-install .cmd { color: #ffffff; font-weight: 500; }
.tg-install .copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  padding: 4px;
  background: none;
  border: none;
  color: #71717a;
  cursor: pointer;
  transition: color 0.15s;
  font-size: 0.8rem;
}
.tg-install:hover .copy-btn { color: #a3ff00; }
.tg-install-wrap { display: flex; justify-content: center; margin-bottom: 2.25rem; }

.tg-hero-links {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.tg-hero-links a {
  padding: 11px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  transition: all 0.2s ease;
}

.tg-hero-links .btn-primary {
  background: #a3ff00;
  color: #000;
  box-shadow: 0 4px 14px rgba(163, 255, 0, 0.25);
}

.tg-hero-links .btn-primary:hover {
  background: #bef264;
  box-shadow: 0 0 24px rgba(163, 255, 0, 0.45);
  transform: translateY(-2px);
}

.tg-hero-links .btn-ghost {
  color: #e4e4e7;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(8px);
}

.tg-hero-links .btn-ghost:hover {
  border-color: rgba(163, 255, 0, 0.5);
  color: #a3ff00;
  background: rgba(163, 255, 0, 0.06);
  transform: translateY(-1px);
}

/* ─── Feature highlights ────────────────── */
.tg-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  overflow: hidden;
  margin-bottom: 5rem;
}

.tg-feature {
  padding: 1.5rem 1.75rem;
  background: rgba(9, 9, 11, 0.7);
  backdrop-filter: blur(16px);
  transition: background 0.2s ease;
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}

.tg-feature:hover {
  background: rgba(18, 18, 20, 0.85);
}

.tg-feature-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.tg-feature-text h4 {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.25rem;
  border: none !important;
  padding: 0 !important;
}

.tg-feature-text p {
  font-size: 0.8rem;
  color: #71717a;
  margin: 0;
  line-height: 1.5;
}

/* ─── Terminal Grid ────────────────────── */
.tg-terminals {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin: 0 auto 5rem;
}

@media (max-width: 768px) {
  .tg-terminals { grid-template-columns: 1fr; }
}

.tg-terminal-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tg-terminal-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #e4e4e7;
  letter-spacing: 0.02em;
}

.tg-terminal-label-step {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(163, 255, 0, 0.1);
  border: 1px solid rgba(163, 255, 0, 0.4);
  color: #a3ff00;
  font-size: 0.8rem;
  font-weight: 800;
  box-shadow: 0 0 12px rgba(163, 255, 0, 0.2);
}

.tg-terminal {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, rgba(24, 24, 27, 0.6) 0%, rgba(9, 9, 11, 0.8) 100%);
  backdrop-filter: blur(32px) saturate(1.2);
  -webkit-backdrop-filter: blur(32px) saturate(1.2);
  box-shadow:
    0 16px 60px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(163, 255, 0, 0.05),
    inset 0 1px 1px rgba(255, 255, 255, 0.12);
  position: relative;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
}

.tg-terminal:hover {
  transform: translateY(-4px);
  border-color: rgba(163, 255, 0, 0.3);
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.6),
    0 0 20px rgba(163, 255, 0, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.12);
}

.tg-terminal::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  background: radial-gradient(circle at top left, rgba(255,255,255,0.025), transparent 50%);
}

.tg-terminal-bar {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  gap: 7px;
  flex-shrink: 0;
}

.tg-terminal-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2);
}

.tg-terminal-dot.r { background: #ef4444; }
.tg-terminal-dot.y { background: #f59e0b; }
.tg-terminal-dot.g { background: #22c55e; }

.tg-terminal-title {
  flex: 1;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 500;
  color: #71717a;
  font-family: var(--vp-font-family-mono);
  letter-spacing: 0.05em;
}

.tg-terminal-body {
  padding: 1.5rem 1.75rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  line-height: 1.9;
  overflow-x: auto;
  color: #e4e4e7;
  flex: 1;
}

.tg-terminal-body .p { color: #a3ff00; text-shadow: 0 0 8px rgba(163, 255, 0, 0.3); }
.tg-terminal-body .c { color: #ffffff; }
.tg-terminal-body .e { color: #ef4444; font-weight: 600; }
.tg-terminal-body .w { color: #f59e0b; font-weight: 600; }
.tg-terminal-body .ok { color: #22c55e; }
.tg-terminal-body .info { color: #60a5fa; }
.tg-terminal-body .m { color: #71717a; }
.tg-terminal-body .d { color: #a1a1aa; }
.tg-terminal-body .sep { color: #3f3f46; }

/* ─── Section ──────────────────────────── */
.tg-section {
  margin-bottom: 4rem;
}

.tg-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #a3ff00;
  margin-bottom: 1.5rem;
  padding: 0 !important;
  border: none !important;
}

/* ─── Glass Cards ───────────────────────── */
.tg-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.tg-card {
  padding: 2.25rem;
  background: rgba(18, 18, 20, 0.4);
  backdrop-filter: blur(24px) saturate(1.2);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.tg-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at center, rgba(163, 255, 0, 0.06) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.tg-card:hover {
  background: rgba(24, 24, 27, 0.6);
  border-color: rgba(163, 255, 0, 0.2);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1);
}

.tg-card:hover::before {
  opacity: 1;
}

.tg-card h3 {
  font-size: 1.35rem;
  font-weight: 700;
  color: rgba(163, 255, 0, 0.75);
  letter-spacing: -0.02em;
  margin: 0 0 0.85rem;
  border: none !important;
  padding: 0 !important;
  transition: color 0.3s ease;
}

.tg-card:hover h3 {
  color: rgba(163, 255, 0, 1);
}

.tg-card .desc {
  font-size: 0.9rem;
  color: #a1a1aa;
  margin: 0 0 1.5rem;
  line-height: 1.6;
}

.tg-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tg-card ul li {
  padding: 0;
  display: flex;
  align-items: center;
}

.tg-card ul li::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #3f3f46;
  margin-right: 10px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.tg-card ul li:hover::before {
  background-color: #a3ff00;
  box-shadow: 0 0 8px rgba(163, 255, 0, 0.8);
  transform: scale(1.4);
}

.tg-card ul li a {
  font-size: 0.9rem;
  color: #d4d4d8;
  text-decoration: none;
  transition: color 0.2s ease, transform 0.2s ease;
  font-weight: 500;
  display: inline-block;
  padding: 4px 0;
}

.tg-card ul li:hover a {
  color: #a3ff00;
  transform: translateX(4px);
}

/* ─── Stats Bar ────────────────────────── */
.tg-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 4rem auto 5rem;
  flex-wrap: wrap;
  max-width: 900px;
}

.tg-stat {
  text-align: center;
  flex: 1;
  min-width: 120px;
  position: relative;
}

.tg-stat:not(:last-child)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 15%;
  height: 70%;
  width: 1px;
  background: linear-gradient(to bottom, transparent, rgba(163, 255, 0, 0.5), transparent);
  box-shadow: 0 0 8px rgba(163, 255, 0, 0.4);
}

.tg-stat .num {
  font-size: 2.25rem;
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 40%, #a3ff00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.04em;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.tg-stat .label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #a1a1aa;
}

@media (max-width: 640px) {
  .tg-stat:not(:last-child)::after {
    display: none;
  }
  .tg-stat {
    margin-bottom: 1.5rem;
    min-width: 40%;
  }
}

/* ─── Footer Note ──────────────────────── */
.tg-footer-note {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  color: #52525b;
  font-size: 0.78rem;
}

.tg-footer-note a {
  color: #a3ff00;
  text-decoration: none;
}

.tg-footer-note a:hover {
  text-decoration: underline;
}
</style>

<div class="tg-docs">

<div class="tg-tubelight"></div>

<div class="tg-hero">
  <div class="tg-hero-badge">◆ v0.5.0-rc.1 · 21 rules · MIT</div>
  <h1>TileGuard <span class="accent">Docs</span></h1>
  <p class="subtitle">
    Rule-based validation for vector tiles and MapLibre styles. Quality gates for your geospatial pipeline — from local dev to CI.
  </p>
  <div class="tg-install-wrap">
    <div class="tg-install" onclick="(function(el){navigator.clipboard&&navigator.clipboard.writeText('npm install @tileguard/cli');el.querySelector('.copy-btn').textContent='✓';setTimeout(()=>el.querySelector('.copy-btn').textContent='📋',1500)})(this)">
      <span class="pkg">npm install</span>
      <span class="cmd">@tileguard/cli</span>
      <button class="copy-btn" title="Copy to clipboard">📋</button>
    </div>
  </div>
  <div class="tg-hero-links">
    <a href="/getting-started/quick-start" class="btn-primary">Quick Start</a>
    <a href="/rules/" class="btn-ghost">Rules Reference</a>
    <a href="/architecture/overview" class="btn-ghost">Architecture</a>
  </div>
</div>

<div class="tg-terminals">

  <div class="tg-terminal-group">
    <div class="tg-terminal-label">
      <span class="tg-terminal-label-step">1</span>
      Check Environment
    </div>
    <div class="tg-terminal">
      <div class="tg-terminal-bar">
        <span class="tg-terminal-dot r"></span>
        <span class="tg-terminal-dot y"></span>
        <span class="tg-terminal-dot g"></span>
        <span class="tg-terminal-title">tileguard doctor</span>
      </div>
      <div class="tg-terminal-body">
        <span class="p">$</span> <span class="c">tileguard doctor</span><br>
        <br>
        <span class="info">ℹ</span> <span class="d">TileGuard v0.5.0-rc.1 · Environment check</span><br>
        <br>
        <span class="ok">✓</span> <span class="m">Node.js</span> <span class="d">22.4.0</span><br>
        <span class="ok">✓</span> <span class="m">pnpm</span> <span class="d">9.6.0</span><br>
        <span class="ok">✓</span> <span class="m">@tileguard/core</span> <span class="d">0.5.0-rc.1</span><br>
        <span class="ok">✓</span> <span class="m">@tileguard/cli</span> <span class="d">0.5.0-rc.1</span><br>
        <span class="ok">✓</span> <span class="m">@tileguard/inspector</span> <span class="d">0.5.0-rc.1</span><br>
        <br>
        <span class="ok">✓</span> <span class="m">12 tile rules · 9 style rules loaded</span><br>
        <span class="w">⚠</span> <span class="d">No tileguard.config.ts — using defaults.</span><br>
        <span class="m">&nbsp; Run: tileguard init</span><br>
        <br>
        <span class="sep">──────────────────────────────────</span><br>
        <span class="ok">✓</span> <span class="d">Environment looks good · 1 warning</span>
      </div>
    </div>
  </div>

  <div class="tg-terminal-group">
    <div class="tg-terminal-label">
      <span class="tg-terminal-label-step">2</span>
      Validate a Tile
    </div>
    <div class="tg-terminal">
      <div class="tg-terminal-bar">
        <span class="tg-terminal-dot r"></span>
        <span class="tg-terminal-dot y"></span>
        <span class="tg-terminal-dot g"></span>
        <span class="tg-terminal-title">tileguard check ./tiles/14/8741/5476.pbf</span>
      </div>
      <div class="tg-terminal-body">
        <span class="p">$</span> <span class="c">tileguard check ./tiles/14/8741/5476.pbf</span><br>
        <br>
        <span class="e">✗</span> <span class="c">tile/self-intersection</span><br>
        <span class="d">&nbsp; Geometry in layer "landuse", feature 42</span><br>
        <span class="d">&nbsp; has intersecting segments 1 and 4.</span><br>
        <span class="m">&nbsp; → layer: landuse · feature: 42 · part: 0</span><br>
        <span class="m">&nbsp; ℹ Simplify or repair this geometry.</span><br>
        <br>
        <span class="w">⚠</span> <span class="c">tile/winding-order</span><br>
        <span class="d">&nbsp; Ring 0 in "buildings", feature 17 has incorrect winding.</span><br>
        <span class="m">&nbsp; → layer: buildings · feature: 17</span><br>
        <br>
        <span class="ok">✓</span> <span class="m">tile/required-layers</span><br>
        <span class="ok">✓</span> <span class="m">tile/coordinate-range</span><br>
        <span class="ok">✓</span> <span class="m">tile/unclosed-ring</span><br>
        <span class="ok">✓</span> <span class="m">tile/hole-containment</span><br>
        <br>
        <span class="sep">──────────────────────────────────</span><br>
        <span class="d">&nbsp; 1 error · 1 warning · 1 file · 34ms</span>
      </div>
    </div>
  </div>

</div>

<div class="tg-stats">
  <div class="tg-stat"><div class="num">21</div><div class="label">Built-in Rules</div></div>
  <div class="tg-stat"><div class="num">12</div><div class="label">Tile Rules</div></div>
  <div class="tg-stat"><div class="num">9</div><div class="label">Style Rules</div></div>
  <div class="tg-stat"><div class="num">10</div><div class="label">CLI Commands</div></div>
  <div class="tg-stat"><div class="num">1,838</div><div class="label">Tests Passing</div></div>
</div>

<div class="tg-section">
  <div class="tg-section-title">
    <span style="display:inline-flex;align-items:center;gap:8px;padding:4px 14px;border-radius:100px;border:1px solid rgba(163,255,0,0.2);background:rgba(163,255,0,0.05);font-size:0.7rem;font-weight:700;color:#a3ff00;letter-spacing:0.12em;text-transform:uppercase;">◆ Navigate the Docs</span>
  </div>
  <div class="tg-cards">
    <div class="tg-card">
      <h3>Get Started</h3>
      <p class="desc">Install, run your first check, understand the output.</p>
      <ul>
        <li><a href="/getting-started/installation">Installation</a></li>
        <li><a href="/getting-started/quick-start">Quick Start</a></li>
        <li><a href="/getting-started/first-check">Your First Tile Check</a></li>
      </ul>
    </div>
    <div class="tg-card">
      <h3>Learn</h3>
      <p class="desc">Concepts, architecture, and how the system fits together.</p>
      <ul>
        <li><a href="/learn/what-is-tileguard">What is TileGuard?</a></li>
        <li><a href="/learn/how-it-works">How It Works</a></li>
        <li><a href="/learn/concepts">Rules & Diagnostics</a></li>
      </ul>
    </div>
    <div class="tg-card">
      <h3>Guides</h3>
      <p class="desc">Task-oriented walkthroughs for real workflows.</p>
      <ul>
        <li><a href="/guides/validating-tiles">Validating Vector Tiles</a></li>
        <li><a href="/guides/inspecting-findings">Inspecting Findings</a></li>
        <li><a href="/guides/comparing-tiles">Comparing Tile Versions</a></li>
        <li><a href="/guides/maplibre-styles">MapLibre Styles</a></li>
        <li><a href="/guides/ci-github-actions">CI / GitHub Actions</a></li>
        <li><a href="/guides/generating-reports">Generating Reports</a></li>
      </ul>
    </div>
    <div class="tg-card">
      <h3>Rules</h3>
      <p class="desc">All 21 rules with configuration, examples, and remediation.</p>
      <ul>
        <li><a href="/rules/#tile-validation-rules">Tile Validation (12)</a></li>
        <li><a href="/rules/#style-lint-rules">Style Linting (9)</a></li>
        <li><a href="/rules/#writing-custom-rules">Writing Custom Rules</a></li>
      </ul>
    </div>
    <div class="tg-card">
      <h3>Architecture</h3>
      <p class="desc">System design, internals, and key engineering decisions.</p>
      <ul>
        <li><a href="/architecture/overview">System Overview</a></li>
        <li><a href="/architecture/validation-pipeline">Validation Pipeline</a></li>
        <li><a href="/architecture/rule-engine">Rule Engine</a></li>
        <li><a href="/architecture/decoder-diagnostics">Decoder & Diagnostics</a></li>
      </ul>
    </div>
    <div class="tg-card">
      <h3>Project</h3>
      <p class="desc">Contribute, develop locally, and follow the roadmap.</p>
      <ul>
        <li><a href="/project/contributing">Contributing</a></li>
        <li><a href="/project/development">Development Setup</a></li>
        <li><a href="/project/roadmap">Roadmap</a></li>
        <li><a href="/project/releases">Releases</a></li>
        <li><a href="/api/">API Reference</a></li>
      </ul>
    </div>
  </div>
</div>

</div>

<!-- ─── CTA Banner ──────────────────────── -->
<div style="margin-top:5rem;padding:4rem 2rem 6rem;text-align:center;position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(163,255,0,0.4),transparent);"></div>
  <p style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:rgba(163,255,0,0.7);margin:0 0 1rem;">◆ Ready to validate your tiles?</p>
  <h2 style="font-size:2.25rem;font-weight:800;color:#fff;letter-spacing:-0.03em;margin:0 0 1rem;line-height:1.1;border:none!important;padding:0!important;">Start in under <span style="color:#a3ff00;">60 seconds</span></h2>
  <p style="color:#a1a1aa;max-width:480px;margin:0 auto 2rem;font-size:1rem;line-height:1.6;">Install TileGuard, run <code style="background:rgba(163,255,0,0.08);color:#a3ff00;padding:2px 8px;border-radius:5px;font-size:0.9em;">tileguard doctor</code>, and validate your first tile in one command.</p>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
    <a href="/getting-started/quick-start" style="padding:13px 28px;background:#a3ff00;color:#000;border-radius:9px;font-weight:700;font-size:0.95rem;text-decoration:none;box-shadow:0 4px 20px rgba(163,255,0,0.3);transition:all 0.2s;">Get Started →</a>
    <a href="/rules/" style="padding:13px 28px;background:rgba(255,255,255,0.06);color:#e4e4e7;border-radius:9px;font-weight:600;font-size:0.95rem;text-decoration:none;border:1px solid rgba(255,255,255,0.1);transition:all 0.2s;">Browse Rules</a>
  </div>
  <p style="margin:2.5rem 0 0;font-size:0.75rem;color:#3f3f46;">MIT Licensed · Made by <a href="https://github.com/shreeharshshinde" style="color:#71717a;text-decoration:none;">Shreeharsh Shinde</a> · FOSS4G 2026 Hiroshima</p>
</div>
