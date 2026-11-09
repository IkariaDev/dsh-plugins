# dsh-plugins

Selbst gebaute Plugins für **DeepSeek Harness (DSH)**.

| Ordner | Bundle-Name | Was es macht |
|---|---|---|
| `cost-display/` | `@local/dsh-cost-display` | zeigt geschätzte API-Kosten pro Runde und für die Sitzung (Pille im Eingabebereich, Zeile unter jeder Antwort), außerdem CommandCode-Guthaben |
| `session-checklist/` | `@dsh-local/view-53e0594c-8715-4807-9031-a73704a42996` | Checkliste als Tab in der rechten Seitenleiste, pro Sitzung gespeichert |

Beide Plugins haben **keine npm-Abhängigkeiten** und brauchen **keinen Build-Schritt**
(React und ReactDOM stellt DSH bereit). Ein Kopieren der Ordner genügt.

## Auf einem anderen Rechner installieren (Windows)

1. **Repo auf den PC holen** – entweder
   - `git clone https://github.com/IkariaDev/dsh-plugins.git` oder
   - auf GitHub **Code → Download ZIP**, entpacken, z. B. nach `C:\Users\<du>\dsh-plugins`.
2. **DSH auf dem PC starten** (möglichst dieselbe Version wie auf dem Rechner, auf dem
   die Plugins gebaut wurden).
3. In der Seitenleiste **Plugins → Add plugin** öffnen und den **absoluten Pfad** eines
   Plugin-Ordners eintragen, zum Beispiel:
   ```
   C:\Users\<du>\dsh-plugins\cost-display
   ```
   Dann **Install** klicken und im Ergebnis **Enable now** wählen.
   (Tipp: im Explorer den Ordner mit gedrückter Umschalttaste rechtsklicken →
   „Als Pfad kopieren“.)
4. Schritt 3 für den zweiten Ordner wiederholen:
   ```
   C:\Users\<du>\dsh-plugins\session-checklist
   ```
5. **DSH neu starten.** Danach erscheinen die Kostenanzeige und der Checklisten-Tab.

Wer lieber die Kommandozeile nimmt (Profilname entsprechend anpassen, hier `desktop`):

```powershell
dsh plugin --profile desktop add link:C:\Users\<du>\dsh-plugins\cost-display
dsh plugin --profile desktop add link:C:\Users\<du>\dsh-plugins\session-checklist
```

Danach die beiden Bundles in **Plugins** einschalten (bzw. `Enable now`).

## Aktualisieren

1. Im Repo-Ordner `git pull` (bzw. das ZIP neu herunterladen und ersetzen).
2. DSH neu starten.

Kommt eine Änderung nicht an: das Plugin in **Plugins** einmal aus- und wieder einschalten
(oder entfernen und erneut hinzufügen).

## Hinweise

- Die Installation über einen lokalen Pfad ist ein **Link** auf den Ordner: den Ordner
  nach der Installation nicht verschieben oder löschen, sonst lädt DSH das Plugin nicht
  mehr.
- Jeder Rechner hat sein eigenes DSH-Profil. Die Plugins werden deshalb **pro Rechner**
  einmal installiert; es gibt keine automatische Synchronisierung.
- Die Bundle-Namen in `package.json` sind die IDs, unter denen DSH das Plugin im Profil
  führt (`dsh.profile.bundles` in der Profil-`package.json`).
- Die Datei `_served_bundle.js` in `cost-display/` ist ein von DSH erzeugtes
  Browser-Bundle und dient nur als Fallback; DSH baut sie bei Bedarf neu.
