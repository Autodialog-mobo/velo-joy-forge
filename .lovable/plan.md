# Briefing: afhandeling van bestellingen op de fulfillmentpagina

Doel: één markdownbestand dat exact beschrijft hoe de fulfillmentpagina vandaag werkt, bruikbaar als briefing voor een andere applicatie. Er wordt niets aan de bestaande app gewijzigd.

## Deliverable

Eén bestand: `velopass-fulfillment-briefing.md` (in Files), in het Nederlands, geschreven als functionele specificatie met concrete waarden (statussen, kleuren, mm-maten, sorteervolgorde), niet als codebeschrijving.

## Inhoud van het document

**1. Overzicht en doel van de pagina**
Werklijst voor dagelijkse verzending: bestellingen zoeken, selecteren, labels printen, als verzonden markeren. Omgevingsschakelaar live/sandbox; lijst van maximaal 500 recente bestellingen, nieuwste eerst.

**2. Weergave van de orders**
- Statustabs met tellers: Alles, Betaald, Geprint, Verzonden. Betaald en Geprint tonen alle openstaande werk; Verzonden telt een rollend venster van 30 dagen; Alles is de som daarvan.
- Secundaire filters: exacte status, taal, land, aantal stickers, plus vrije zoekopdracht over naam, e-mail, order-ID (ook eerste 8 tekens), straat, postcode, stad, land, betaal-ID en betalernaam.
- Filters, sortering en omgeving blijven bewaard na verversen.
- Tabelkolommen: selectievakje, datum, status, klant, adres, items, aantal stickers, bedrag. Sorteerbaar op datum, bedrag en stickers.
- Statusbadge: gekleurde stip plus Nederlands label (Betaald groen, Geprint oranje, Verzonden grijs, foutstatussen rood).
- Waarschuwing wanneer een statustab wel resultaten heeft maar secundaire filters de lijst leegmaken.
- Detailvenster per order met klantgegevens, regels, gebeurtenislog en navigatie naar vorige/volgende order via pijlknoppen én toetsenbordpijlen, binnen dezelfde statusgroep.

**3. Orderstatussen**
Tabel met: pending, paid, printed, shipped, plus expired, failed, cancelled, refunded. Per status: betekenis, Nederlands label, kleur, wie de status zet (betaalwebhook of admin) en toegestane overgangen:
- paid → printed (bulk, bij printen)
- printed → shipped (bulk)
- printed → paid en shipped → printed (terugdraaien, per order)
- soft delete met hersteloptie en een apart Verwijderd-filter
Elke overgang schrijft een ordergebeurtenis (type, oude status, nieuwe status, wie, tijdstip) en een auditregel.

**4. Bulkverwerking**
- Selectie via kop-selectievakje (alles in de huidige filterweergave) of per rij.
- Acties op selectie: labels genereren, markeren als geprint, markeren als verzonden, CSV exporteren, bulk verwijderen met undo-venster van 8 seconden.
- Statusovergangen zijn voorwaardelijk in de database: alleen rijen met de verwachte oude status wijzigen, zodat herprinten van al verzonden orders nooit iets terugzet.
- Printflow in stappen: PDF genereren → printvenster openen → status bijwerken → rapport tonen met per order oude en nieuwe status. Bij fout: automatische rollback per order, rapport met resultaat per rij (teruggedraaid / mislukt) en een knop "Opnieuw" met dezelfde batch.
- Alles wordt geaudit, ook mislukte printbatches.

**5. Labelvoorbeeld en printen**
- Voorbeeldvenster met alle labels: volgorde wijzigen via slepen of pijlen, labels uitsluiten, adres per label bijwerken alleen voor deze PDF (order blijft ongewijzigd), inzoomen op één label.
- Hulpmiddelen: overlay met veilige zone, instelbare printerbreedte (standaard 87 mm), veilige marge en kleuren voor snijlijn/veilige zone.
- Automatische sorteervolgorde van de batch: land oplopend → taal oplopend → aantal stickers oplopend.

**6. Labelspecificatie**
- Formaat: DYMO LabelWriter, standaard adreslabel, 89 × 28 mm liggend.
- Marges: 2 mm links, 2 mm boven/onder, 4 mm rechts (de printer voert 87 mm stock aan, dus extra rechtermarge tegen wegvallen van tekens).
- Adresblok linksboven: naam vet, adresregel 1, adresregel 2, postcode + stad, land in hoofdletters.
- Automatisch passend: lettergrootte start op 11 pt en zakt in stappen van 0,5 tot minimaal 6 pt tot alles binnen breedte en hoogte past; regelafstand factor 1,25.
- Onderschrift rechtsonder: "aantal stickers · TAALCODE", 7,5 pt vet, grijs, krimpt indien nodig; onderaan blijft een strook vrij zodat adres en onderschrift elkaar nooit raken.
- Uitvoer: één PDF met één pagina per label, bestandsnaam met datum; bij geblokkeerd printvenster valt de flow terug op downloaden.

**7. CSV-export**
Kolommen: order_id, created_at, status, customer_email, shipping_name, shipping_line1, shipping_postal_code, shipping_city, shipping_country, referral_source, items (sku x aantal), sticker_total, amount_total_eur.

**8. Aandachtspunten voor hergebruik**
Voorwaardelijke statusupdates, rollback, auditlog, scheiding live/sandbox, en het feit dat labelbewerkingen de order niet wijzigen.
