#!/usr/bin/env node
/**
 * Generates Chrome Web Store screenshots (1280×800) for ZDF Mediathek Hotkeys.
 * Output: store/screenshots/screenshot-{1,2,3}.png
 *
 * Usage: node scripts/screenshots.js
 */

"use strict";

const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/homebrew/bin/chromium";
const OUT_DIR  = path.resolve(__dirname, "../store/screenshots");
const W = 1280, H = 800;

fs.mkdirSync(OUT_DIR, { recursive: true });

/* ─────────────────────────────────────────────
   Shared design tokens (match popup.css)
───────────────────────────────────────────── */
const T = {
  bg:      "#1a1a1a",
  surface: "#242424",
  border:  "#333",
  text:    "#f0f0f0",
  muted:   "#888",
  accent:  "#fa7d19",
};

/* ─────────────────────────────────────────────
   Reusable HTML fragments
───────────────────────────────────────────── */

const POPUP_HTML = /* html */`
<div class="popup">
  <header>
    <img src="file://${path.resolve(__dirname, "../icons/icon48.png")}" class="logo" />
    <div>
      <h1>ZDF Hotkeys</h1>
      <p class="subtitle">YouTube-ähnliche Tastenkürzel</p>
    </div>
    <label class="toggle">
      <input type="checkbox" checked />
      <span class="slider"></span>
    </label>
  </header>

  <section class="keymap">
    <h2>Tastenkürzel</h2>
    <table>
      <tr><td><kbd>Space</kbd> / <kbd>K</kbd></td><td>Play / Pause</td></tr>
      <tr><td><kbd>F</kbd></td><td>Vollbild an/aus</td></tr>
      <tr><td><kbd>M</kbd></td><td>Stummschalten</td></tr>
      <tr><td><kbd>←</kbd> / <kbd>J</kbd></td><td>10 s zurück</td></tr>
      <tr><td><kbd>→</kbd> / <kbd>L</kbd></td><td>10 s vor</td></tr>
      <tr><td><kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd></td><td>30 s zurück / vor</td></tr>
      <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Lautstärke +/−10 %</td></tr>
      <tr><td><kbd>C</kbd></td><td>Untertitel an/aus</td></tr>
      <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Springe zu 0–90 %</td></tr>
      <tr><td><kbd>,</kbd> / <kbd>.</kbd></td><td>1 Bild zurück / vor</td></tr>
    </table>
  </section>
</div>`;

const POPUP_CSS = /* css */`
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --accent:  ${T.accent};
  --bg:      ${T.bg};
  --surface: ${T.surface};
  --border:  ${T.border};
  --text:    ${T.text};
  --muted:   ${T.muted};
}
.popup {
  width: 360px;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,0.7);
}
header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px 12px; border-bottom: 1px solid var(--border);
}
.logo { width: 36px; height: 36px; border-radius: 6px; }
header > div { flex: 1; }
h1 { font-size: 15px; font-weight: 700; }
.subtitle { font-size: 11px; color: var(--muted); }
.toggle { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
.toggle input { display: none; }
.slider {
  position: absolute; inset: 0; background: var(--accent);
  border-radius: 11px;
}
.slider::before {
  content: ""; position: absolute;
  width: 16px; height: 16px; left: 3px; top: 3px;
  background: #fff; border-radius: 50%;
  transform: translateX(18px);
}
section { padding: 12px 16px; }
h2 {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--muted); margin-bottom: 8px;
}
table { width: 100%; border-collapse: collapse; }
td { padding: 3px 0; vertical-align: middle; }
td:first-child { white-space: nowrap; padding-right: 10px; }
td:last-child { color: var(--muted); }
kbd {
  display: inline-block; background: var(--surface);
  border: 1px solid var(--border); border-radius: 4px;
  padding: 1px 5px; font-size: 11px; font-family: inherit;
  color: var(--text); line-height: 1.6;
}`;

const SETTINGS_CSS = /* css */`
.setting-row {
  display: flex; justify-content: space-between; align-items: center;
  gap: 8px; padding: 5px 0;
}
.setting-row span { flex: 1; }
.setting-row input[type="number"] {
  width: 64px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 5px; color: var(--text); font-size: 13px;
  padding: 3px 7px; text-align: right;
}
.setting-row input.focused { border-color: var(--accent); }
.save-hint { font-size: 11px; color: #5cb85c; margin-top: 6px; text-align: right; }`;

/* ─────────────────────────────────────────────
   Player backdrop (shared across screenshots)
───────────────────────────────────────────── */
function playerBackdrop(extra = "") {
  return /* html */`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${W}px; height: ${H}px; overflow: hidden;
    background: #0d0d0d;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  /* ── Simulated ZDF page chrome ── */
  .nav {
    height: 56px; background: #111; border-bottom: 1px solid #222;
    display: flex; align-items: center; padding: 0 24px; gap: 32px;
  }
  .nav-logo {
    font-size: 22px; font-weight: 900; letter-spacing: -0.5px;
    color: #fff; background: ${T.accent}; padding: 2px 10px; border-radius: 4px;
  }
  .nav-item { font-size: 13px; color: #aaa; }
  .nav-item.active { color: #fff; }

  /* ── Video player area ── */
  .player-wrap {
    position: relative;
    width: 100%;
    height: ${H - 56}px;
    background: #000;
    overflow: hidden;
  }

  /* fake video gradient */
  .video-bg {
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% 40%, #1a3a5c 0%, #0a0a0a 70%);
  }

  /* faint grid to suggest video content */
  .video-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 60px 60px;
  }

  /* play indicator */
  .video-title {
    position: absolute; bottom: 90px; left: 48px;
    color: rgba(255,255,255,0.9);
    font-size: 22px; font-weight: 700;
    text-shadow: 0 2px 8px rgba(0,0,0,0.8);
  }
  .video-meta {
    position: absolute; bottom: 64px; left: 48px;
    color: rgba(255,255,255,0.5); font-size: 13px;
  }

  /* bottom controls bar */
  .controls {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 56px; padding: 0 16px;
    background: linear-gradient(transparent, rgba(0,0,0,0.85));
    display: flex; align-items: center; gap: 12px;
  }
  .ctrl-btn {
    width: 28px; height: 28px; border-radius: 50%;
    background: rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 13px;
  }
  .progress-bg {
    flex: 1; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px;
  }
  .progress-fg {
    width: 38%; height: 100%; background: ${T.accent}; border-radius: 2px;
    position: relative;
  }
  .progress-fg::after {
    content: ""; position: absolute; right: -5px; top: -4px;
    width: 12px; height: 12px; background: ${T.accent}; border-radius: 50%;
  }
  .time { font-size: 12px; color: rgba(255,255,255,0.7); white-space: nowrap; }

  ${extra}
</style>
</head>
<body>
<div class="nav">
  <span class="nav-logo">ZDF</span>
  <span class="nav-item active">Mediathek</span>
  <span class="nav-item">Sendungen A–Z</span>
  <span class="nav-item">Live</span>
</div>
<div class="player-wrap">
  <div class="video-bg"></div>
  <div class="video-grid"></div>
  <div class="video-title">Terra X: Faszination Universum</div>
  <div class="video-meta">Dokumentation · 43 min</div>
  <div class="controls">
    <div class="ctrl-btn">⏸</div>
    <div class="ctrl-btn">⏭</div>
    <div class="progress-bg"><div class="progress-fg"></div></div>
    <div class="time">16:22 / 43:00</div>
    <div class="ctrl-btn">🔊</div>
    <div class="ctrl-btn">⛶</div>
  </div>
</div>`;
}

/* ─────────────────────────────────────────────
   Screenshot definitions
───────────────────────────────────────────── */

const screenshots = [

  /* ── 1: Popup open over the player ── */
  {
    name: "screenshot-1.png",
    label: "Popup: Hotkey-Übersicht",
    html: () => playerBackdrop(/* css */`
      ${POPUP_CSS}
      .overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.45);
        display: flex; align-items: center; justify-content: center;
      }
      /* pill label above popup */
      .pill {
        position: absolute; top: -36px; left: 50%; transform: translateX(-50%);
        background: ${T.accent}; color: #fff;
        font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 99px;
        white-space: nowrap;
      }
      .popup-wrap { position: relative; }
    `) + /* html */`
    <div class="overlay">
      <div class="popup-wrap">
        <div class="pill">⌨️ Erweiterung aktiv</div>
        ${POPUP_HTML}
      </div>
    </div>
    </div></body></html>`,
  },

  /* ── 2: OSD nudge banner in action ── */
  {
    name: "screenshot-2.png",
    label: "OSD-Feedback-Banner",
    html: () => playerBackdrop(/* css */`
      .nudge {
        position: absolute;
        bottom: 100px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.78);
        color: #fff;
        font-size: 20px; font-weight: 700;
        letter-spacing: 0.03em;
        padding: 12px 28px;
        border-radius: 8px;
        box-shadow: 0 2px 20px rgba(0,0,0,0.6);
        white-space: nowrap;
        z-index: 10;
      }
      .key-hints {
        position: absolute; top: 24px; right: 24px;
        display: flex; flex-direction: column; gap: 10px; align-items: flex-end;
      }
      .key-row {
        display: flex; align-items: center; gap: 8px;
        background: rgba(0,0,0,0.55); border-radius: 6px;
        padding: 6px 12px;
        backdrop-filter: blur(4px);
      }
      .key-row kbd {
        display: inline-block; background: #2a2a2a;
        border: 1px solid #555; border-radius: 4px;
        padding: 2px 7px; font-size: 13px; font-family: inherit;
        color: #f0f0f0; line-height: 1.6;
      }
      .key-row span { color: rgba(255,255,255,0.65); font-size: 12px; }
      .key-row.active kbd { border-color: ${T.accent}; color: ${T.accent}; }
      .key-row.active span { color: #fff; }
    `) + /* html */`
    <div class="nudge">▶&nbsp;&nbsp;+10 s</div>

    <div class="key-hints">
      <div class="key-row active"><kbd>→</kbd> / <kbd>L</kbd> <span>10 s vor</span></div>
      <div class="key-row"><kbd>←</kbd> / <kbd>J</kbd> <span>10 s zurück</span></div>
      <div class="key-row"><kbd>Space</kbd> <span>Play / Pause</span></div>
      <div class="key-row"><kbd>F</kbd> <span>Vollbild</span></div>
      <div class="key-row"><kbd>M</kbd> <span>Stummschalten</span></div>
      <div class="key-row"><kbd>↑</kbd> / <kbd>↓</kbd> <span>Lautstärke</span></div>
    </div>

    </div></body></html>`,
  },

  /* ── 3: Settings panel ── */
  {
    name: "screenshot-3.png",
    label: "Konfigurierbare Einstellungen",
    html: () => playerBackdrop(/* css */`
      ${POPUP_CSS}
      ${SETTINGS_CSS}
      .overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.45);
        display: flex; align-items: center; justify-content: center;
      }
      .popup-wrap { position: relative; }
      .pill {
        position: absolute; top: -36px; left: 50%; transform: translateX(-50%);
        background: #5cb85c; color: #fff;
        font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 99px;
        white-space: nowrap;
      }
      .settings-popup {
        width: 360px; background: ${T.bg}; color: ${T.text};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px; line-height: 1.5;
        border-radius: 10px; overflow: hidden;
        box-shadow: 0 8px 40px rgba(0,0,0,0.7);
      }
      .settings-popup header {
        display: flex; align-items: center; gap: 10px;
        padding: 14px 16px 12px; border-bottom: 1px solid ${T.border};
      }
      .settings-popup .logo { width: 36px; height: 36px; border-radius: 6px; }
      .settings-popup header > div { flex: 1; }
      .settings-popup h1 { font-size: 15px; font-weight: 700; }
      .settings-popup .subtitle { font-size: 11px; color: ${T.muted}; }
      .settings-popup .toggle { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
      .settings-popup .toggle input { display: none; }
      .settings-popup .slider {
        position: absolute; inset: 0; background: ${T.accent}; border-radius: 11px;
      }
      .settings-popup .slider::before {
        content: ""; position: absolute;
        width: 16px; height: 16px; left: 3px; top: 3px;
        background: #fff; border-radius: 50%; transform: translateX(18px);
      }
      .settings-popup section {
        padding: 12px 16px; border-bottom: 1px solid ${T.border};
      }
      .settings-popup section:last-child { border-bottom: none; }
      .settings-popup h2 {
        font-size: 11px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.08em; color: ${T.muted}; margin-bottom: 8px;
      }
    `) + /* html */`
    <div class="overlay">
      <div class="popup-wrap">
        <div class="pill">⚙️ Einstellungen anpassen</div>
        <div class="settings-popup">
          <header>
            <img src="file://${path.resolve(__dirname, "../icons/icon48.png")}" class="logo" />
            <div>
              <h1>ZDF Hotkeys</h1>
              <p class="subtitle">YouTube-ähnliche Tastenkürzel</p>
            </div>
            <label class="toggle">
              <input type="checkbox" checked />
              <span class="slider"></span>
            </label>
          </header>
          <section>
            <h2>Einstellungen</h2>
            <label class="setting-row">
              <span>Spulweite (Sekunden)</span>
              <input type="number" value="10" class="focused" />
            </label>
            <label class="setting-row">
              <span>Spulweite Shift (Sekunden)</span>
              <input type="number" value="30" />
            </label>
            <label class="setting-row">
              <span>Lautstärke-Schritt (%)</span>
              <input type="number" value="10" />
            </label>
            <label class="setting-row">
              <span>Bildrate für Einzelbild (FPS)</span>
              <input type="number" value="25" />
            </label>
            <p class="save-hint">✓ Einstellungen gespeichert</p>
          </section>
        </div>
      </div>
    </div>

    </div></body></html>`,
  },
];

/* ─────────────────────────────────────────────
   Main
───────────────────────────────────────────── */
(async () => {
  console.log("Launching browser…");
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });

  for (const shot of screenshots) {
    console.log(`  → ${shot.name}  (${shot.label})`);
    await page.setContent(shot.html(), { waitUntil: "networkidle0" });
    const outPath = path.join(OUT_DIR, shot.name);
    await page.screenshot({ path: outPath, type: "png" });
    console.log(`     saved: ${outPath}`);
  }

  await browser.close();
  console.log("\nDone ✓  Screenshots in store/screenshots/");
})();
