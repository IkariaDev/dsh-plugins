# @local/dsh-cost-display

Zeigt die **geschätzten API-Kosten** in der DeepSeek-Harness-Weboberfläche:

- **Statusleiste über dem Eingabefeld**: eine Pille `≈ 0,32 €` neben den vorhandenen Token-Zählern. Sie zählt die gesamte Sitzung; ein Klick öffnet die Aufschlüsselung nach Cache-Treffern, nicht zwischengespeicherter Eingabe und Ausgabe – im Stil des vorhandenen „Token-Nutzung"-Dialogs. Escape oder ein Klick daneben schließt sie.
- **Unter jeder abgeschlossenen Runde**: eine Zeile `≈ 0,0045 € · 358K Token · Cache 97%` am Ende der Antwort, direkt über der Aktionszeile.

Preise kommen aus zwei Quellen: der offiziellen DeepSeek-Preisliste für die
Routen `deepseek-account`/`deepseek` **und** der CommandCode-Provider-API-Preistabelle
für den Custom-Provider `commandcode`. Das Modell wird dabei aus der jeweiligen
Runde bzw. für die Sitzungspille aus der zuletzt benutzten Modellauswahl
genommen; ein Provider-Präfix wie `deepseek/` wird entfernt.

- **Bekannte Modelle** (DeepSeek, CommandCode und `:free`-Modelle) werden exakt bepreist.
- **Unbekannte Modelle** fallen auf den DeepSeek-Flash-Tarif zurück (als Schätzung
  gekennzeichnet), statt bei `0,00 €` stehen zu bleiben.
- **Kostenlose Modelle** (`:free`) bleiben bei `0,00 €`, zeigen im Tooltip aber `kostenlos`.

## Sidebar-Logo

Das Plugin blendet zusätzlich die **DeepSeek-Harness-Marke in der Seitenleiste** aus
(Wal-Mark und Wortmarke). Dafür belegt es die beiden `single`-Slots
`sidebar.brand.mark` und `sidebar.brand.name` mit einem leeren Baustein und der
Priorität `-1`; die niedrigste Priorität gewinnt einen `single`-Slot, also
verschwindet die offizielle Marke samt Fallback, während Layout, Sitzungs-Schalter
und Tooltips der Seitenleiste erhalten bleiben. Die animierte Marke im leeren
Chat-Bereich (Hero) bleibt bestehen. Zum Wiederherstellen die beiden
`ctx.slots.inject(...)`-Blöcke in `apply()` auskommentieren.

## CommandCode-Nutzungsmesser

Links neben den vorhandenen Statistik-Pillen sitzt ein kleiner Ring mit dem
verbleibenden Guthaben. Er zeigt den knappsten der beiden Nutzungsfenster als
Ring (grün > 40 %, gelb ≤ 40 %, rot ≤ 15 %) und daneben das CommandCode-Guthaben
in Dollar. Ein Klick öffnet die Diagramme:

- **5-Stunden-Fenster** und **Wochen-Fenster**: verbraucht / Limit je Fenster in
  Dollar, Restwert und Reset-Zeitpunkt (die „5-hour / weekly limits" aus
  `GET /alpha/billing/credits`).
- **Guthaben**: Plan-, gekaufte und Gratis-Credits, Abrechnungszeitraum bis …
  (`/alpha/billing/credits` + `/alpha/billing/subscriptions`).
- **Verlauf**: Balkenchart des tatsächlichen Verbrauchs pro Messintervall
  (Differenz zwischen zwei Stichproben, 5 Stunden + Woche, letzte ~40
  Intervalle), gespeichert unter `localStorage`. In Leerlaufphasen zeigt die
  Karte statt einer flachen Linie einen Hinweis, dass kein Verbrauch gemessen
  wurde.
- **Zeitraum-Statistik**: Kosten, Token, Anfragen und Erfolgsquote aus
  `/alpha/usage/summary`.

Die Abfrage läuft im **Host-Teil** des Plugins (`index.js`): Er löst
`COMMANDCODE_API_KEY` über die Credential-Schnittstelle auf und stellt die Daten
unter `GET /api/commandcode-usage` bereit (authentifiziert über die bestehende
Browser-Sitzung, mit 30 s Cache). Die CommandCode-Endpunkte verlangen den
Bearer-Key und einen `User-Agent: cli`; der Browser bekommt den Schlüssel nie zu
sehen.

## Währung

Die Preise sind in **USD** abgerechnet; angezeigt wird **Euro**. Umrechnungsfaktor ist der EZB-Referenzkurs vom 06.11.2026 (`1 US$ = 0,8957 €`), der als `EUR_PER_USD` zusammen mit `FX_DATE` im Kopf von `client.js` steht – dort lässt er sich aktualisieren.

## Preisgrundlage

Offizielle DeepSeek-Preisliste (<https://api-docs.deepseek.com/quick_start/pricing/>, Stand 2026-11-08), USD pro 1 Mio. Token:

| Modell | Cache-Treffer | Cache-Miss | Ausgabe |
|:--|--:|--:|--:|
| `deepseek-flash` (Peak) | 0.006 | 0.30 | 1.20 |
| `deepseek-v4-pro` (Peak) | 0.044 | 1.32 | 3.96 |

- **Off-Peak** ist exakt die Hälfte. Peak gilt 01:00–04:00 und 06:00–10:00 UTC, Montag–Freitag (ohne chinesische Feiertage); alles andere ist Off-Peak. Die Runden-Zeile rechnet mit dem Zeitpunkt der Runde, die Statusleiste mit der aktuellen Uhrzeit.
- **Cache-Schreiben** wird bei DeepSeek nicht separat berechnet; CommandCode-Modelle mit veröffentlichtem Cache-Write-Preis (z. B. Claude) werden dagegen bepreist.
- **Reasoning-Token** sind eine Teilmenge der Ausgabe-Token und werden nicht doppelt gezählt.
- Kein Bestandteil des Preises: Websuche, Extraktion, Toolkosten.

CommandCode-Provider-API (<https://commandcode.ai/docs/resources/pricing-limits>, Stand 2026-11-08) liefert Preise pro Modell-ID; die Tabelle steht als `COMMANDCODE_RATES` in `client.js` und `pricing.js`. DeepSeek-Modelle dort spiegeln die DeepSeek-Peak/Off-Peak-Regeln, alle anderen Modelle haben einen festen Tarif.

`cost = (uncachedInput × cacheMiss + cacheRead × cacheHit + cacheWrite × cacheWrite + output × output) / 1e6`

## Grenzen

- Es sind **Schätzungen** (keine Abrechnung). Basis sind die vom Anbieter gemeldeten Usage-Werte der Runden.
- Pro **Runde**, nicht pro einzelnem Modellaufruf: mehrere Versuche einer Runde werden aggregiert. Das ist die Granularität, die die Oberfläche bereitstellt.
- Ein unbekanntes Modell ohne Tabelleneintrag wird mit dem DeepSeek-Flash-Tarif geschätzt (weiterhin als Schätzung gekennzeichnet); einen exakten Wert liefert nur ein Eintrag in `COMMANDCODE_RATES` bzw. `PEAK_PRICES`.
- Die Statusleisten-Pille nimmt für die Sitzungssumme das **zuletzt benutzte Modell** an, weil die Sitzungs-Token-Projektion keine Modellzuordnung enthält. Wechselt eine Sitzung das Modell, ist die Summe eine Mischschätzung.
- Bleiben die Werte in einer bereits geöffneten Oberfläche stehen, hilft ein Reload (Strg+R): Die Statusleiste liest Live-Projektionen, die nach einem Profil-/Provider-Wechsel in alten Tabs nicht neu abonniert werden.

## Preise aktualisieren

Preise stehen oben in `client.js` in `PEAK_PRICES`. Nach einer Änderung am verlinkten Paket genügt ein Reload des Fensters (Strg+R); die Dateien werden direkt aus diesem Verzeichnis geladen.

## Entfernen

Über die Plugins-Seite (Entfernen) oder mit dem `plugin_manager`-Werkzeug (`remove_bundle`).
