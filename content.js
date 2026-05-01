/**
 * ZDF Mediathek Hotkeys – content.js
 *
 * Hotkey-Übersicht (YouTube-kompatibel):
 *   Space / K        → Play / Pause
 *   F                → Vollbild an/aus
 *   M                → Stummschalten an/aus
 *   ArrowLeft  / J   → 10 s zurückspulen  (+ Shift → 30 s)
 *   ArrowRight / L   → 10 s vorspulen     (+ Shift → 30 s)
 *   ArrowUp          → Lautstärke +10 %
 *   ArrowDown        → Lautstärke −10 %
 *   0–9              → Springe zu 0–90 % der Videolänge
 *   C                → Untertitel ein/aus
 *   ,                → Ein Bild zurück (wenn pausiert)
 *   .                → Ein Bild vor    (wenn pausiert)
 */

"use strict";

/* ─────────────────────────────────────────────
   Konfiguration (Standardwerte)
───────────────────────────────────────────── */
const DEFAULT_CONFIG = {
  seekSeconds:      10,   // Sekunden für Links/Rechts
  seekSecondsShift: 30,   // Sekunden bei Shift+Links/Rechts
  volumeStep:       0.10, // Lautstärkeänderung pro Tastendruck
  frameRate:        25,   // FPS für Einzelbild-Sprung (,/.)
  enabled:          true, // Extension aktiv?
};

let config = { ...DEFAULT_CONFIG };

// Gespeicherte Einstellungen laden
chrome.storage.sync.get(DEFAULT_CONFIG, (saved) => {
  config = { ...DEFAULT_CONFIG, ...saved };
});

// Auf Änderungen aus dem Popup reagieren
chrome.storage.onChanged.addListener((changes) => {
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key in config) config[key] = newValue;
  }
});

/* ─────────────────────────────────────────────
   Hilfsfunktionen: Player-Elemente finden
───────────────────────────────────────────── */

/**
 * Findet das aktive <video>-Element auf der Seite.
 * Bevorzugt ein Element, das bereits spielt oder eine Quelle hat.
 */
function findVideo() {
  const videos = Array.from(document.querySelectorAll("video"));
  if (!videos.length) return null;
  // Priorisiere das Video, das gerade abgespielt wird oder eine Quelle hat
  return (
    videos.find((v) => !v.paused && !v.ended) ||
    videos.find((v) => v.readyState >= 2) ||
    videos.find((v) => v.src || v.querySelector("source")) ||
    videos[0]
  );
}

/**
 * Findet den äußersten Player-Container (für Vollbild-Requests).
 * ZDF nutzt typischerweise einen `<div>` mit einer Klasse wie
 * "zdfplayer", "player-container", oder ein Shadow-DOM.
 */
function findPlayerContainer(video) {
  if (!video) return document.documentElement;

  // Bekannte ZDF-Player-Wrapper (Stand 2024–2025)
  const candidates = [
    ".zdfplayer",
    ".player__wrapper",
    ".player-container",
    "[class*='player']",
    "[class*='Player']",
  ];

  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el && el.contains(video)) return el;
  }

  // Fallback: Elternelement des <video>
  return video.closest("figure, section, div") || video.parentElement || document.documentElement;
}

/* ─────────────────────────────────────────────
   Aktionen
───────────────────────────────────────────── */

function togglePlayPause(video) {
  if (!video) return;
  if (video.paused || video.ended) {
    video.play();
  } else {
    video.pause();
  }
}

function seek(video, seconds) {
  if (!video) return;
  const max = Number.isFinite(video.duration) ? video.duration : Infinity;
  const newTime = Math.min(
    Math.max(video.currentTime + seconds, 0),
    max
  );
  video.currentTime = newTime;
  showNudge(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
}

function seekToPercent(video, percent) {
  if (!video || !video.duration) return;
  video.currentTime = (video.duration * percent) / 100;
  showNudge(`${percent}%`);
}

function changeVolume(video, delta) {
  if (!video) return;
  const next = Math.min(Math.max(video.volume + delta, 0), 1);
  video.volume = Math.round(next * 100) / 100;
  if (video.muted && delta > 0) video.muted = false;
  showNudge(`🔊 ${Math.round(video.volume * 100)} %`);
}

function toggleMute(video) {
  if (!video) return;
  video.muted = !video.muted;
  showNudge(video.muted ? "🔇 Stumm" : `🔊 ${Math.round(video.volume * 100)} %`);
}

function toggleFullscreen(video) {
  if (!video) return;
  const container = findPlayerContainer(video);

  if (!document.fullscreenElement) {
    (container.requestFullscreen || container.webkitRequestFullscreen).call(container);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }
}

function stepFrame(video, direction) {
  if (!video) return;
  if (!video.paused) video.pause();
  video.currentTime += direction / config.frameRate;
}

function toggleSubtitles(video) {
  if (!video) return;
  const tracks = Array.from(video.textTracks);
  if (!tracks.length) {
    showNudge("Keine Untertitel");
    return;
  }
  // Suche nach einem aktiven Track
  const active = tracks.find((t) => t.mode === "showing");
  if (active) {
    tracks.forEach((t) => (t.mode = "hidden"));
    showNudge("Untertitel: aus");
  } else {
    // Aktiviere den ersten verfügbaren Untertitel-Track
    const sub =
      tracks.find((t) => t.kind === "subtitles") ||
      tracks.find((t) => t.kind === "captions") ||
      tracks[0];
    sub.mode = "showing";
    showNudge(`Untertitel: ${sub.label || sub.language || "an"}`);
  }
}

/* ─────────────────────────────────────────────
   OSD-Overlay (kleines Feedback-Banner)
───────────────────────────────────────────── */

let nudgeTimer = null;
let nudgeEl = null;

function getOrCreateNudge() {
  if (!nudgeEl || !document.body.contains(nudgeEl)) {
    nudgeEl = document.createElement("div");
    nudgeEl.id = "zdf-hotkey-nudge";
    document.body.appendChild(nudgeEl);
  }
  return nudgeEl;
}

function showNudge(text) {
  const el = getOrCreateNudge();
  el.textContent = text;
  el.classList.add("zdf-hotkey-nudge--visible");

  if (nudgeTimer) clearTimeout(nudgeTimer);
  nudgeTimer = setTimeout(() => {
    el.classList.remove("zdf-hotkey-nudge--visible");
  }, 1200);
}

/* ─────────────────────────────────────────────
   Event-Handler
───────────────────────────────────────────── */

/**
 * Prüft, ob der Fokus auf einem Eingabefeld liegt.
 * In dem Fall KEINE Hotkeys auslösen.
 */
function isFocusedOnInput() {
  const tag = document.activeElement?.tagName?.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    document.activeElement?.isContentEditable
  );
}

function onKeyDown(e) {
  if (!config.enabled) return;
  if (isFocusedOnInput()) return;

  // Modifier-Tasten (außer Shift) ignorieren
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  const video = findVideo();

  // Wir behandeln die Taste nur, wenn ein Video auf der Seite ist
  if (!video) return;

  const shift = e.shiftKey;
  let handled = true;

  switch (e.key) {
    // ── Play / Pause ──────────────────────────────
    case " ":
    case "k":
    case "K":
      togglePlayPause(video);
      break;

    // ── Vollbild ──────────────────────────────────
    case "f":
    case "F":
      toggleFullscreen(video);
      break;

    // ── Stummschalten ─────────────────────────────
    case "m":
    case "M":
      toggleMute(video);
      break;

    // ── Vor-/Zurückspulen ─────────────────────────
    case "ArrowLeft":
    case "j":
    case "J":
      seek(video, -(shift ? config.seekSecondsShift : config.seekSeconds));
      break;

    case "ArrowRight":
    case "l":
    case "L":
      seek(video, +(shift ? config.seekSecondsShift : config.seekSeconds));
      break;

    // ── Lautstärke ───────────────────────────────
    case "ArrowUp":
      changeVolume(video, +config.volumeStep);
      break;

    case "ArrowDown":
      changeVolume(video, -config.volumeStep);
      break;

    // ── Untertitel ────────────────────────────────
    case "c":
    case "C":
      toggleSubtitles(video);
      break;

    // ── Einzelbild-Sprung (nur wenn pausiert) ─────
    case ",":
      stepFrame(video, -1);
      break;

    case ".":
      stepFrame(video, +1);
      break;

    // ── Prozentualer Sprung (0–9) ─────────────────
    case "0": seekToPercent(video, 0);  break;
    case "1": seekToPercent(video, 10); break;
    case "2": seekToPercent(video, 20); break;
    case "3": seekToPercent(video, 30); break;
    case "4": seekToPercent(video, 40); break;
    case "5": seekToPercent(video, 50); break;
    case "6": seekToPercent(video, 60); break;
    case "7": seekToPercent(video, 70); break;
    case "8": seekToPercent(video, 80); break;
    case "9": seekToPercent(video, 90); break;

    default:
      handled = false;
  }

  if (handled) {
    // Standardverhalten unterdrücken (z. B. Scrollen bei Space/Pfeiltasten)
    e.preventDefault();
    e.stopPropagation();
  }
}

// Listener auf Capture-Phase, damit wir VOR dem Player-eigenen Handler sind
document.addEventListener("keydown", onKeyDown, true);

/* ────────────────────────────────────────────────
   Icon-Status – Kommunikation mit Background
──────────────────────────────────────────────── */

function notifyBackground() {
  chrome.runtime.sendMessage({
    type: "videoStatusChanged",
    hasVideo: !!findVideo(),
  }).catch(() => { /* Service Worker noch nicht bereit */ });
}

// Auf Anfrage des Background antworten
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "getVideoStatus") {
    sendResponse({ hasVideo: !!findVideo() });
  }
  return false;
});

// Background \xfcber Video-Erscheinen/-Verschwinden informieren (MutationObserver)
const _videoObserver = new MutationObserver(() => {
  notifyBackground();
});
_videoObserver.observe(document.body, { childList: true, subtree: true });

// Einmalig beim Laden melden
notifyBackground();
