# Haupt-Loop: Trigger → Scout → Output → Sleep

```mermaid
sequenceDiagram
    participant TM as TriggerMaster
    participant Scout as Scout (z.B. RKW-Innovation)
    participant Hunt as Hunt/
    participant Ship as Ship/Digests
    participant Wiki as Wiki/Today

    TM->>Scout: Wecken + klarer Auftrag
    Scout->>Scout: Auftrag ausführen (Scope einhalten)
    Scout->>Hunt: Hunt-Signal schreiben
    Scout->>Scout: Detaillierte Analyse im eigenen Ordner
    Scout->>Ship: Kurzer Digest (≤ 8 Zeilen)
    Scout->>TM: „Aufgabe erledigt – gehe wieder schlafen“
    TM->>Scout: Status → SCHLAFEND
    TM->>Wiki: Protokoll + Historie aktualisieren
```

*Haupt-Loop der Scout-Aktivierung – ROSARY-ATLAS V4*