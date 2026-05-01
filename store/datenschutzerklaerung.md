# Datenschutzerklärung – ZDF Mediathek Hotkeys

*Stand: Mai 2026*

## 1. Verantwortlicher

Diese Chrome-Erweiterung wird als Open-Source-Projekt bereitgestellt.  
Quellcode: <https://github.com/arne-kapell/zdf-streaming-hotkeys>

## 2. Grundsatz

ZDF Mediathek Hotkeys erhebt, speichert, verarbeitet oder überträgt **keinerlei personenbezogene Daten**. Es findet keine Kommunikation mit externen Servern statt.

## 3. Gespeicherte Daten

Die Erweiterung speichert ausschließlich die vom Nutzer eingestellten Konfigurationswerte lokal im Browser:

| Einstellung | Standardwert | Speicherort |
|---|---|---|
| Erweiterung aktiv (an/aus) | `true` | `chrome.storage.sync` |
| Spulweite in Sekunden | `10` | `chrome.storage.sync` |
| Spulweite mit Shift in Sekunden | `30` | `chrome.storage.sync` |
| Lautstärke-Schritt | `0.10` | `chrome.storage.sync` |
| Bildrate für Einzelbild-Sprung | `25` | `chrome.storage.sync` |

`chrome.storage.sync` ist ein browsereigener Speicher, der vom Chrome-Profil des Nutzers verwaltet wird. Die Synchronisation zwischen Geräten erfolgt ausschließlich über die Google-Infrastruktur des angemeldeten Chrome-Profils und unterliegt damit der [Datenschutzerklärung von Google](https://policies.google.com/privacy). Die Erweiterung selbst hat keinen Einfluss auf diesen Vorgang und überträgt die Daten nicht an eigene Server.

## 4. Berechtigungen

| Berechtigung | Zweck |
|---|---|
| `storage` | Einstellungen lesen und speichern (siehe Abschnitt 3) |
| `tabs` | Toolbar-Icon je nach aktivem Tab aktualisieren; Kommunikation mit dem Content Script auf zdf.de |
| `https://www.zdf.de/*`, `https://zdf.de/*` | Content Script ausschließlich auf ZDF-Mediathek-Seiten einbinden, um Tastenkürzel am `<video>`-Element zu registrieren |

Es werden keine Tabs außerhalb von zdf.de ausgelesen. Tab-URLs, -Titel oder der Browserverlauf werden weder gespeichert noch übertragen.

## 5. Keine Weitergabe an Dritte

Es werden keine Daten an Dritte weitergegeben. Die Erweiterung enthält keine Analyse-, Werbe- oder Tracking-Bibliotheken und stellt keine Netzwerkanfragen.

## 6. Änderungen dieser Erklärung

Änderungen werden im [GitHub-Repository](https://github.com/arne-kapell/zdf-streaming-hotkeys) versioniert und sind dort nachvollziehbar.
