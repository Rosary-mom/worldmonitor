# ROSARY-ATLAS – Agent Organigramm & Loops

Dieses Verzeichnis enthält die aktuelle Visualisierung und Dokumentation des **ROSARY-ATLAS Multi-Agent-Systems**.

ROSARY-ATLAS ist ein lokal betriebenes, Obsidian-basiertes Multi-Agent-Orchester (powered by Hermes + Grok), das als Second Brain und automatisierte Scout-Schwarm für Rosary.health / ROSARY Projekte dient.

## Enthaltene Dateien

### Mermaid-Diagramme
- **00-Organigramm-Mermaid.md** – Gesamtstruktur (Excellenzen • Dirigenten • Scouts)
- **01-Haupt-Loop.md** – Kernprozess: Trigger → Scout → Output → Sleep
- **02-Daily-Cron-Loop.md** – Tägliche Automatisierung (07:45 / 08:15 / 14:00)
- **03-Scout-Aktivierungs-Loop.md** – Detaillierter Weck- und Schlaf-Prozess
- **04-Gesamt-Orchester-Loop.md** – Zusammenspiel von ATLAS, AMEISE und den Excellenzen

### Interaktiver Graph
- **vault-graph.html** – Selbstständige, offline-fähige HTML-Datei mit interaktivem Force-Directed-Graph des gesamten Vaults (37+ Notes, farbige Gruppen, Timeline, Suche).

## Verwendung auf der Website

### 1. Mermaid-Diagramme einbetten
Die `.md`-Dateien enthalten reinen Mermaid-Code.  
Auf GitHub und den meisten modernen Websites (inkl. monitor.rosenkranz.eu.com) werden sie automatisch gerendert.

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
