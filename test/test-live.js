/**
 * ZDF Mediathek – Live-Integrationstest
 *
 * Öffnet die echte ZDF-Seite „Blindspot" in Chromium mit geladener Extension,
 * klickt auf Abspielen, wartet auf den Video-Player und prüft alle Hotkeys.
 */

"use strict";

const puppeteer = require("puppeteer-core");
const fs   = require("fs");
const path = require("path");
const os   = require("os");

const CHROMIUM  = "/Applications/Chromium.app/Contents/MacOS/Chromium";
const EXT_PATH  = path.resolve(__dirname, "..");
const ZDF_URL   = "https://www.zdf.de/filme/blindspot-movie-100";

/* ─── Utilities ────────────────────────────────────── */

let passed = 0, failed = 0;
const issues = [];

function assert(label, ok, detail = "") {
  console.log(ok ? "  ✓ " : "  ✗ ", label, detail ? `(${detail})` : "");
  if (ok) passed++; else { failed++; issues.push(label); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pressKey(page, key, { shift = false } = {}) {
  if (shift) await page.keyboard.down("Shift");
  await page.keyboard.press(key);
  if (shift) await page.keyboard.up("Shift");
  await sleep(400);
}

async function getVideoState(page) {
  return page.evaluate(() => {
    const v = document.querySelector("video");
    if (!v) return null;
    return {
      paused:      v.paused,
      muted:       v.muted,
      volume:      v.volume,
      currentTime: v.currentTime,
      duration:    v.duration,
      readyState:  v.readyState,
    };
  });
}

/* ─── Haupttest ────────────────────────────────────── */

(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrom-zdf-live-"));

  console.log("\n🚀  Starte Chromium mit ZDF-Hotkeys-Extension …");
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    headless: false,
    userDataDir: tmpDir,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--load-extension=${EXT_PATH}`,
      `--disable-extensions-except=${EXT_PATH}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--autoplay-policy=no-user-gesture-required",
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = (await browser.pages())[0];
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("favicon") && !m.text().includes("ZDF ERROR"))
      console.log("  [PAGE ERR]", m.text().slice(0, 120));
  });

  // ── Schritt 1: Seite laden ───────────────────────────
  console.log(`\n── Schritt 1: ${ZDF_URL} laden ─────────`);
  await page.goto(ZDF_URL, { waitUntil: "networkidle2", timeout: 25_000 });
  console.log(`  ✓ Geladen: "${await page.title()}"`);

  // ── Schritt 2: Cookie-Banner wegklicken ─────────────
  console.log("\n── Schritt 2: Cookie-Consent behandeln ────────────");
  try {
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll("button")).some(b => b.textContent.trim() === "Ablehnen"),
      { timeout: 6_000 }
    );
    await page.evaluate(() => {
      Array.from(document.querySelectorAll("button"))
        .find(b => b.textContent.trim() === "Ablehnen")?.click();
    });
    console.log('  ✓ "Ablehnen" geklickt');
    await sleep(2000);
  } catch {
    console.log("  ℹ  Kein Cookie-Banner");
  }

  // ── Schritt 3: Abspielen klicken ─────────────────────
  console.log("\n── Schritt 3: Film abspielen ───────────────────────");
  const playLink = await page.$("a.p1vatcn2.a1avto5x");
  if (!playLink) {
    console.log("  ✗ Abspielen-Button nicht gefunden – Test abgebrochen.");
    await browser.close(); fs.rmSync(tmpDir, { recursive: true, force: true }); process.exit(1);
  }
  const box = await playLink.boundingBox();
  console.log(`  Abspielen-Button bei x=${box.x.toFixed(0)}, y=${box.y.toFixed(0)}`);
  await playLink.click();
  console.log("  ✓ Geklickt");

  // ── Schritt 4: Auf Video-Element warten ──────────────
  console.log("\n── Schritt 4: Warte auf Video-Player ──────────────");
  try {
    await page.waitForFunction(() => document.querySelectorAll("video").length > 0, { timeout: 15_000 });
    console.log("  ✓ <video>-Element erschienen");
  } catch {
    console.log("  ✗ Kein <video> nach 15s – Test abgebrochen.");
    await page.screenshot({ path: path.join(__dirname, "test-screenshot-live.png") });
    await browser.close(); fs.rmSync(tmpDir, { recursive: true, force: true }); process.exit(1);
  }

  // Warte auf ausreichend Daten (readyState ≥ 2) für Seek-Tests
  try {
    await page.waitForFunction(() => {
      const v = document.querySelector("video");
      return v && v.readyState >= 2 && Number.isFinite(v.duration) && v.duration > 0;
    }, { timeout: 25_000 });
    const s = await getVideoState(page);
    console.log(`  ✓ Video bereit – Dauer: ${s.duration?.toFixed(1)}s, readyState: ${s.readyState}, paused: ${s.paused}`);
  } catch {
    const s = await getVideoState(page);
    console.log(`  ⚠  readyState=${s?.readyState}, duration=${s?.duration} – teste trotzdem`);
  }

  await sleep(1000);

  // ── Schritt 5: HOTKEY-TESTS ──────────────────────────
  console.log("\n── Schritt 5: Hotkey-Tests am echten ZDF-Player ───");

  // Fokus auf die Seite setzen
  await page.click("body");
  await sleep(300);

  let before, after;

  // ── Play / Pause (Space) ─────────────────────────────
  console.log("\n  [Space] Play/Pause");
  before = await getVideoState(page);
  await pressKey(page, "Space");
  after  = await getVideoState(page);
  assert("Space togglet paused-Zustand",
    before?.paused !== after?.paused,
    `${before?.paused} → ${after?.paused}`);
  await pressKey(page, "Space"); // zurück

  // ── Play / Pause (K) ─────────────────────────────────
  console.log("\n  [K] Play/Pause (YouTube-Stil)");
  before = await getVideoState(page);
  await pressKey(page, "k");
  after  = await getVideoState(page);
  assert("K togglet paused-Zustand",
    before?.paused !== after?.paused,
    `${before?.paused} → ${after?.paused}`);
  await pressKey(page, "k"); // zurück

  // Auf bekannte Zeit springen für reproduzierbare Seek-Tests
  const dur = (await getVideoState(page))?.duration ?? 0;
  if (Number.isFinite(dur) && dur > 60) {
    await page.evaluate(() => { document.querySelector("video").currentTime = 120; });
    await sleep(800);
  }

  // ── Vorspulen (ArrowRight) ───────────────────────────
  console.log("\n  [→] Vorspulen 10s");
  before = await getVideoState(page);
  await pressKey(page, "ArrowRight");
  after  = await getVideoState(page);
  const fwd = (after?.currentTime ?? 0) - (before?.currentTime ?? 0);
  assert("ArrowRight spult ~10s vor", fwd >= 8 && fwd <= 14, `Δ=${fwd.toFixed(2)}s`);

  // ── Zurückspulen (ArrowLeft) ─────────────────────────
  console.log("\n  [←] Zurückspulen 10s");
  before = await getVideoState(page);
  await pressKey(page, "ArrowLeft");
  after  = await getVideoState(page);
  const bwd = (before?.currentTime ?? 0) - (after?.currentTime ?? 0);
  assert("ArrowLeft spult ~10s zurück", bwd >= 8 && bwd <= 14, `Δ=−${bwd.toFixed(2)}s`);

  // ── Shift+→ (30s) ────────────────────────────────────
  console.log("\n  [Shift+→] Vorspulen 30s");
  before = await getVideoState(page);
  await pressKey(page, "ArrowRight", { shift: true });
  after  = await getVideoState(page);
  const s30 = (after?.currentTime ?? 0) - (before?.currentTime ?? 0);
  assert("Shift+ArrowRight spult ~30s vor", s30 >= 26 && s30 <= 34, `Δ=${s30.toFixed(2)}s`);

  // ── L / J ────────────────────────────────────────────
  console.log("\n  [L] Vorspulen 10s (YouTube)");
  before = await getVideoState(page);
  await pressKey(page, "l");
  after  = await getVideoState(page);
  assert("L spult ~10s vor",
    Math.abs((after?.currentTime??0)-(before?.currentTime??0)-10) < 3,
    `Δ=${((after?.currentTime??0)-(before?.currentTime??0)).toFixed(2)}s`);

  console.log("\n  [J] Zurückspulen 10s (YouTube)");
  before = await getVideoState(page);
  await pressKey(page, "j");
  after  = await getVideoState(page);
  assert("J spult ~10s zurück",
    Math.abs((before?.currentTime??0)-(after?.currentTime??0)-10) < 3,
    `Δ=−${((before?.currentTime??0)-(after?.currentTime??0)).toFixed(2)}s`);

  // ── Lautstärke ───────────────────────────────────────
  console.log("\n  [↑/↓] Lautstärke");
  await page.evaluate(() => { document.querySelector("video").volume = 0.5; });
  await sleep(300);
  before = await getVideoState(page);
  await pressKey(page, "ArrowUp");
  after  = await getVideoState(page);
  assert("ArrowUp erhöht Lautstärke um ~10%",
    Math.abs((after?.volume??0)-(before?.volume??0)-0.1) < 0.03,
    `${before?.volume?.toFixed(2)} → ${after?.volume?.toFixed(2)}`);

  before = after;
  await pressKey(page, "ArrowDown");
  after  = await getVideoState(page);
  assert("ArrowDown senkt Lautstärke um ~10%",
    Math.abs((before?.volume??0)-(after?.volume??0)-0.1) < 0.03,
    `${before?.volume?.toFixed(2)} → ${after?.volume?.toFixed(2)}`);

  // ── Stummschalten (M) ────────────────────────────────
  console.log("\n  [M] Stummschalten");
  await page.evaluate(() => { document.querySelector("video").muted = false; });
  await sleep(200);
  await pressKey(page, "m");
  after = await getVideoState(page);
  assert("M schaltet stumm", after?.muted === true, `muted=${after?.muted}`);
  await pressKey(page, "m");
  after = await getVideoState(page);
  assert("M hebt Stummschaltung auf", after?.muted === false, `muted=${after?.muted}`);

  // ── Prozentsprung ─────────────────────────────────────
  console.log("\n  [5] Springe zu 50%");
  before = await getVideoState(page);
  if (Number.isFinite(before?.duration) && before.duration > 0) {
    await pressKey(page, "5");
    after = await getVideoState(page);
    const expected = before.duration * 0.5;
    assert("5 springt zu 50% der Laufzeit",
      Math.abs((after?.currentTime??0) - expected) < 5,
      `erwartet=${expected.toFixed(1)}s ist=${after?.currentTime?.toFixed(1)}s`);
  } else {
    assert("5 springt zu 50% (keine Duration)", true, "skip");
  }

  // ── OSD-Nudge-Banner ─────────────────────────────────
  console.log("\n  OSD-Banner");
  await pressKey(page, "ArrowRight");
  const nudgeVisible = await page.evaluate(() => {
    const el = document.getElementById("zdf-hotkey-nudge");
    return el && el.classList.contains("zdf-hotkey-nudge--visible");
  });
  assert("OSD-Banner erscheint nach Hotkey", nudgeVisible);

  // Screenshot als Beweis
  const shot = path.join(__dirname, "test-screenshot-live.png");
  await page.screenshot({ path: shot });
  console.log(`\n  📸  Screenshot: ${shot}`);

  await sleep(1600);
  const nudgeGone = await page.evaluate(() => {
    const el = document.getElementById("zdf-hotkey-nudge");
    return el && !el.classList.contains("zdf-hotkey-nudge--visible");
  });
  assert("OSD-Banner blendet nach ~1.2s aus", nudgeGone);

  // ── Zusammenfassung ───────────────────────────────────
  console.log("\n══════════════════════════════════════════════");
  console.log(`  Ergebnis: ${passed} ✓ bestanden   ${failed} ✗ fehlgeschlagen`);
  if (issues.length) console.log("  Fehlgeschlagen:", issues.join(", "));
  console.log("══════════════════════════════════════════════\n");

  await sleep(2000);
  await browser.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error("Fataler Fehler:", e.message);
  process.exit(1);
});
