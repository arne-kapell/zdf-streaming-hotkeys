# Chrome Web Store – Store Listing

## Short description (max 132 chars)
```
YouTube-ähnliche Tastenkürzel für den ZDF Mediathek Video-Player: Play/Pause, Vollbild, Lautstärke, Vor-/Zurückspulen u. v. m.
```
*(126 Zeichen – passt)*

---

## Detailed description (plain text, paste into the store form)

```
Steuere den ZDF Mediathek Video-Player genau wie auf YouTube – ohne Maus, ohne Login, ohne Tracking.

─── TASTENKÜRZEL ───────────────────────────

  Space / K       Play / Pause
  F               Vollbild an/aus
  M               Stummschalten an/aus
  ← / J           10 s zurückspulen
  → / L           10 s vorspulen
  Shift + ← / →   30 s zurück / vor
  ↑               Lautstärke +10 %
  ↓               Lautstärke −10 %
  C               Untertitel an/aus
  0 – 9           Springe zu 0 %–90 % der Laufzeit
  ,               1 Bild zurück (nur wenn pausiert)
  .               1 Bild vor   (nur wenn pausiert)

─── EINSTELLUNGEN ──────────────────────────

Alle Werte lassen sich im Popup anpassen:
  • Spulweite (Standard: 10 s)
  • Spulweite mit Shift (Standard: 30 s)
  • Lautstärke-Schritt (Standard: 10 %)
  • Bildrate für Einzelbild-Sprung (Standard: 25 FPS)

Die Einstellungen werden über chrome.storage.sync geräteübergreifend gespeichert.

─── OSD-FEEDBACK ───────────────────────────

Ein dezentes Banner zeigt kurz an, was gerade passiert – z. B. „+10 s" beim Vorspulen oder „🔇 Stumm" beim Stummschalten.

─── TECHNISCHE DETAILS ─────────────────────

  • Manifest V3 (aktuell & zukunftssicher)
  • Nur eine Permission: storage (für Einstellungen) + tabs (für Icon-Status)
  • Keine externen Abhängigkeiten, kein Tracking, keine Datenerhebung
  • Hotkeys werden automatisch deaktiviert, wenn ein Eingabefeld den Fokus hat
  • Funktioniert auf www.zdf.de und zdf.de

─── DATENSCHUTZ ────────────────────────────

Diese Erweiterung sammelt, überträgt oder speichert keinerlei persönliche Daten.
Einstellungen werden ausschließlich lokal in chrome.storage.sync abgelegt.

Quellcode: https://github.com/arne-kapell/zdf-streaming-hotkeys
```

---

## Category
**Productivity**

## Language
**Deutsch**

## Screenshots

| Datei | Beschreibung (caption im Store) |
|---|---|
| `screenshot-1.png` | Popup mit vollständiger Hotkey-Übersicht |
| `screenshot-2.png` | OSD-Feedback-Banner beim Vorspulen |
| `screenshot-3.png` | Konfigurierbare Einstellungen |

## Privacy disclosure (single-purpose description)

> This extension adds keyboard shortcuts (play/pause, seek, volume, fullscreen, subtitles) to the ZDF Mediathek video player on zdf.de. It does not collect, transmit, or store any user data. Settings are saved locally via chrome.storage.sync.
