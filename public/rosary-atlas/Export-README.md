Diese Dateien sind für das GitHub-Repo https://github.com/Rosary-mom/worldmonitor unter public/rosary-atlas/ bestimmt.

## Ausschluss (intern)

Der öffentliche Export enthält **keine** Vault-Ordner wie `Nachweise/`. Zusätzlich gilt die Ausschlussliste:

- `Export/exclude-from-public.txt`
- Insbesondere: `Nachweise/Legacy Philosophen-Hain und Rosarium.md` (`sichtbarkeit: intern – nicht veröffentlichen`)

Beim Regenerieren von `vault-graph.html` für den öffentlichen Export diese Notiz ausschließen (siehe lokalen Build mit Temporarily-Exclude). Nicht ungeprüft das lokale `Maps/Graphs/vault-graph.html` nach `public/rosary-atlas/` kopieren, wenn es interne Knoten enthält.