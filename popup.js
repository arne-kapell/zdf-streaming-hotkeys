"use strict";

const DEFAULT_CONFIG = {
  seekSeconds:      10,
  seekSecondsShift: 30,
  volumeStep:       0.10,
  frameRate:        25,
  enabled:          true,
};

const ids = {
  enabled:          "enabledToggle",
  seekSeconds:      "seekSeconds",
  seekSecondsShift: "seekSecondsShift",
  volumeStep:       "volumeStep",
  frameRate:        "frameRate",
};

// ── Initialisierung ────────────────────────────────

chrome.storage.sync.get(DEFAULT_CONFIG, (cfg) => {
  document.getElementById(ids.enabled).checked = cfg.enabled;
  document.getElementById(ids.seekSeconds).value      = cfg.seekSeconds;
  document.getElementById(ids.seekSecondsShift).value = cfg.seekSecondsShift;
  document.getElementById(ids.volumeStep).value       = Math.round(cfg.volumeStep * 100);
  document.getElementById(ids.frameRate).value        = cfg.frameRate;
});

// ── Speichern ──────────────────────────────────────

let saveTimer = null;

function saveSettings() {
  const enabled = document.getElementById(ids.enabled).checked;
  const seekSeconds      = parseInt(document.getElementById(ids.seekSeconds).value,      10);
  const seekSecondsShift = parseInt(document.getElementById(ids.seekSecondsShift).value, 10);
  const volumeStepPct    = parseInt(document.getElementById(ids.volumeStep).value,       10);
  const frameRate        = parseInt(document.getElementById(ids.frameRate).value,        10);

  // Validierung
  if (
    isNaN(seekSeconds) || seekSeconds < 1 ||
    isNaN(seekSecondsShift) || seekSecondsShift < 1 ||
    isNaN(volumeStepPct) || volumeStepPct < 1 || volumeStepPct > 50 ||
    isNaN(frameRate) || frameRate < 1 || frameRate > 60
  ) return;

  const toSave = {
    enabled,
    seekSeconds,
    seekSecondsShift,
    volumeStep: volumeStepPct / 100,
    frameRate,
  };

  chrome.storage.sync.set(toSave, () => {
    const hint = document.getElementById("saveHint");
    hint.textContent = "✓ Gespeichert";
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { hint.textContent = ""; }, 2000);
  });
}

// ── Listener ───────────────────────────────────────

// Sofortiges Speichern beim Toggle
document.getElementById(ids.enabled).addEventListener("change", saveSettings);

// Verzögertes Speichern bei Zahleneingaben
const numberInputs = [ids.seekSeconds, ids.seekSecondsShift, ids.volumeStep, ids.frameRate];
numberInputs.forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveSettings, 600);
  });
});
