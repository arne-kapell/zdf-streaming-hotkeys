# ZDF Mediathek Hotkeys

Eine Chrome-Extension, die dem Video-Player der [ZDF Mediathek](https://www.zdf.de) YouTube-ähnliche Tastenkürzel hinzufügt – ohne Login, ohne Tracking, ohne externe Abhängigkeiten.

![Icon](icons/icon128.png)

---

## Tastenkürzel

| Taste | Funktion |
|---|---|
| `Space` / `K` | Play / Pause |
| `F` | Vollbild an/aus |
| `M` | Stummschalten an/aus |
| `←` / `J` | 10 s zurückspulen |
| `→` / `L` | 10 s vorspulen |
| `Shift` + `←` / `→` | 30 s zurück / vor |
| `↑` | Lautstärke +10 % |
| `↓` | Lautstärke −10 % |
| `C` | Untertitel an/aus |
| `0` – `9` | Springe zu 0 %–90 % der Laufzeit |
| `,` | 1 Bild zurück (nur wenn pausiert) |
| `.` | 1 Bild vor (nur wenn pausiert) |

> Alle Werte (Spulweite, Lautstärke-Schritt, Bildrate) sind im Popup konfigurierbar.  
> Hotkeys werden **automatisch deaktiviert**, wenn ein Eingabefeld den Fokus hat.

---

## Installation (Entwicklermodus)

1. **`chrome://extensions`** öffnen
2. **„Entwicklermodus"** (oben rechts) aktivieren
3. **„Entpackte Erweiterung laden"** klicken
4. Den Ordner `zdf-streaming-hotkeys` auswählen
5. Fertig – auf [zdf.de](https://www.zdf.de) navigieren, einen Film/eine Sendung öffnen und auf „Abspielen" klicken

---

## Projektstruktur

```
zdf-streaming-hotkeys/
├── manifest.json       – Extension-Manifest (Manifest V3)
├── content.js          – Hotkey-Engine (läuft auf zdf.de)
├── overlay.css         – OSD-Feedback-Banner
├── popup.html          – Popup: Shortcut-Übersicht + Einstellungen
├── popup.css           – Popup-Styles
├── popup.js            – Popup-Logik (Einstellungen via chrome.storage.sync)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── test/
│   ├── test-live.js           – Puppeteer-Integrationstest (live auf zdf.de)
│   └── test-screenshot-live.png  – Beweis-Screenshot des letzten Testlaufs
└── package.json        – npm-Metadaten (puppeteer-core für Tests)
```

---

## Tests

Der Integrationstest öffnet Chromium mit der Extension, lädt einen echten ZDF-Film und verifiziert alle Hotkeys automatisch:

```bash
npm install   # einmalig
npm test
```

---

## Technische Details

| Merkmal | Detail |
|---|---|
| Manifest-Version | V3 (aktuell/zukunftssicher) |
| Permissions | nur `storage` (für Einstellungen) |
| Externe Abhängigkeiten | keine |
| Tastenerkennung | Capture-Phase (`addEventListener(..., true)`) – höhere Priorität als der ZDF-Player |
| Player-Anbindung | direkt über natives `<video>`-Element – unabhängig von Player-Klassen |
| Einstellungen | `chrome.storage.sync` (geräteübergreifend) |
| OSD-Feedback | animiertes Banner (`#zdf-hotkey-nudge`) |
| Input-Guard | Hotkeys automatisch deaktiviert bei Fokus auf `<input>`, `<textarea>`, `contenteditable` |
