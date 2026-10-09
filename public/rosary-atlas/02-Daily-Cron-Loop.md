# Daily Cron-Loop (Auslöser-Excellenz)

```mermaid
flowchart LR
    A[07:45 Status-Check<br/>nur lesen] --> B[08:15 Signal-Scan<br/>+ Keyword-Check]
    B -->|relevante Keywords| C[Passenden Scout wecken]
    C --> D[Scout arbeitet]
    D --> E[Outputs + Protokoll]
    E --> F[Scout wieder schlafen]
    F --> G[14:00 Prioritäts-Check]
    G --> A
```

*Daily Cron-Loop – ROSARY-ATLAS V4 · Stand 09.10.2026*
