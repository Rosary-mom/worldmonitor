# ROSARY-ATLAS – Agent Organigramm & Loops

Dieses Verzeichnis enthält die öffentliche Visualisierung und Dokumentation des **ROSARY-ATLAS Multi-Agent-Systems** (Stand 09.10.2026).

ROSARY-ATLAS ist ein lokal betriebenes, Obsidian-basiertes Multi-Agent-Orchester (powered by Hermes + Grok), das als Second Brain und automatisierter Scout-Schwarm für Rosary.health / ROSARY Projekte dient.

**Öffentliche Fassung:** Bots werden mit Namen gezeigt (5 Grok Bots, 5 Pilot-Bots). Alle übrigen 91 Agenten erscheinen nur als Gruppen mit Anzahl; Notiznamen im Graphen sind anonymisiert („Knoten N“).

## Enthaltene Dateien

### Mermaid-Diagramme
- **00-Organigramm-Mermaid.md** – Gesamtstruktur (Grok Bots • Pilot-Bots • 13 Agenten-Gruppen)
- **01-Haupt-Loop.md** – Kernprozess: Trigger → Scout → Output → Sleep
- **02-Daily-Cron-Loop.md** – Tägliche Automatisierung (07:45 / 08:15 / 14:00)
- **03-Scout-Aktivierungs-Loop.md** – Detaillierter Weck- und Schlaf-Prozess
- **04-Gesamt-Orchester-Loop.md** – Zusammenspiel von Dirigenten, Excellenzen und Grok Bots

### Interaktiver Graph
- **vault-graph.html** – Selbstständige, offline-fähige HTML-Datei mit interaktivem Force-Directed-Graph des Vaults (146 Notizen, 452 Verknüpfungen, 14 Gruppen inkl. „Nachweise“, Timeline, Suche; Notiznamen anonymisiert).

## Nachweis

Gewerbeanmeldung Gemeinde Bitz, Nr. 202300000034, seit 25.10.2023 – Tätigkeit: Leitung Fernuniversität und Ferncampus mit Logos Bibel. Betreiber: Uwe A. E. Rosenkranz, Einzelunternehmen (natürliche Person, persönliche Haftung), KMU.

- [Gewerbeanmeldung (PDF, geschwärzt)](nachweise/Gewerbeanmeldung-Uni-Campus-Leiter-geschwaerzt.pdf) – online: https://monitor.rosenkranz.eu.com/rosary-atlas/nachweise/Gewerbeanmeldung-Uni-Campus-Leiter-geschwaerzt.pdf

## Agenten-Gruppen (91)

| Gruppe | Anzahl |
|---|---|
| 🛡️ Excellenzen | 5 |
| 💼 Office-Team | 16 |
| 🎼 Dirigenten | 2 |
| 🧭 Steuerung | 6 |
| 🔭 Scouts | 5 |
| 🛰️ Mesh-Scouts | 8 |
| ⚙️ Hermes-Team | 9 |
| 🏭 Prozesse | 8 |
| 📣 Kanäle | 6 |
| 🎁 Angebote | 8 |
| 💶 Erlösmodelle | 4 |
| 🗺️ Wegweiser | 7 |
| 🧬 TechBio | 7 |

**Bots:** Grok Bots – MeshGuardian, StateForge, BootstrapRunner, SkillPropagator, CostAuditor · Pilot-Bots – Landwirtschaft, Politik, Handel, Education, Remigration.

## Verwendung auf der Website

### 1. Mermaid-Diagramme einbetten
Die `.md`-Dateien enthalten Mermaid-Code in ```` ```mermaid ````-Blöcken.
Auf GitHub und mit jedem Mermaid-Renderer werden sie automatisch dargestellt.

### 2. Interaktiven Graph einbinden
Die Datei `vault-graph.html` kann direkt verlinkt oder in einem `<iframe>` eingebettet werden:

```html
<iframe
  src="/rosary-atlas/vault-graph.html"
  width="100%"
  height="800"
  style="border: none; border-radius: 8px;"
  title="ROSARY-ATLAS Interactive Agent Graph">
</iframe>
```
