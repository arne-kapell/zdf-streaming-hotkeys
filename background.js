"use strict";

/**
 * Background Service Worker – Icon-Zustandsmaschine
 *
 * Drei Zustände:
 *   "active"   – Extension an + Tab auf zdf.de + <video> vorhanden
 *                → farbiges Icon (orange K)
 *   "inactive" – Extension an, aber kein aktives Video im aktuellen Tab
 *                → graues Icon, kein Strich
 *   "disabled" – Extension per Toggle deaktiviert
 *                → graues Icon mit roter Durchstreichlinie
 */

const ZDF_ORIGIN = "https://www.zdf.de";

const ICONS = {
  active:   { 16: "icons/icon16.png",          48: "icons/icon48.png",          128: "icons/icon128.png"          },
  inactive: { 16: "icons/icon16-inactive.png", 48: "icons/icon48-inactive.png", 128: "icons/icon128-inactive.png" },
  disabled: { 16: "icons/icon16-disabled.png", 48: "icons/icon48-disabled.png", 128: "icons/icon128-disabled.png" },
};

/* ─── Hilfsfunktionen ──────────────────────────────────────────────────────── */

async function isEnabled() {
  const { enabled } = await chrome.storage.sync.get({ enabled: true });
  return enabled;
}

/** Fragt den Content Script des Tabs, ob ein <video> vorhanden ist. */
async function tabHasVideo(tabId) {
  try {
    const resp = await chrome.tabs.sendMessage(tabId, { type: "getVideoStatus" });
    return resp?.hasVideo === true;
  } catch {
    // Content Script noch nicht injiziert (z. B. chrome://-Seiten, neue Tabs)
    return false;
  }
}

/** Gibt die URL des Tabs zurück (null bei Fehler). */
async function getTabUrl(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab.url ?? null;
  } catch {
    return null;
  }
}

/* ─── Kern-Logik ───────────────────────────────────────────────────────────── */

async function updateIcon(tabId) {
  // Aktiven Tab ermitteln falls kein tabId übergeben
  if (tabId == null) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab?.id ?? null;
  }
  if (tabId == null) return;

  if (!await isEnabled()) {
    return chrome.action.setIcon({ path: ICONS.disabled, tabId });
  }

  const url = await getTabUrl(tabId);
  const onZDF = url?.startsWith(ZDF_ORIGIN) ?? false;

  if (!onZDF) {
    return chrome.action.setIcon({ path: ICONS.inactive, tabId });
  }

  // Auf ZDF: nur orange wenn auch wirklich ein <video> da ist
  const hasVideo = await tabHasVideo(tabId);
  chrome.action.setIcon({ path: hasVideo ? ICONS.active : ICONS.inactive, tabId });
}

/* ─── Event-Listener ───────────────────────────────────────────────────────── */

chrome.runtime.onInstalled.addListener(() => updateIcon(null));
chrome.runtime.onStartup.addListener(()   => updateIcon(null));

// Tab-Wechsel
chrome.tabs.onActivated.addListener(({ tabId }) => updateIcon(tabId));

// URL-Änderung (SPA-Navigation innerhalb ZDF)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url !== undefined) updateIcon(tabId);
});

// Content Script meldet Video-Erscheinen/-Verschwinden
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "videoStatusChanged" && sender.tab?.id != null) {
    updateIcon(sender.tab.id);
  }
});

// Toggle im Popup
chrome.storage.onChanged.addListener((changes) => {
  if ("enabled" in changes) updateIcon(null);
});
