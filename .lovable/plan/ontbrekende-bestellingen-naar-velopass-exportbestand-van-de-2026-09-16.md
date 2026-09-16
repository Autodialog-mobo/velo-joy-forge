# Ontbrekende bestellingen naar Velopass + exportbestand van de oude bestellingen

Twee aparte stukken werk, op basis van jouw keuzes.

## 1. De ontbrekende webshopbestellingen alsnog doorsturen

Aan onze kant staan 188 bestellingen met een Velopass-nummer, in jouw export staan er 63. Ik vergelijk beide lijsten op ordernummer (`WEB-...`) en stuur enkel de ontbrekende opnieuw door met de live gegevens. Dubbel doorsturen kan geen kwaad: Velopass herkent dezelfde bestelling.

Daarna controleer ik het resultaat en meld ik hoeveel er opnieuw aanvaard zijn en of er fouten waren. Vraag daarna gerust een verse export op om te bevestigen dat het er nu 188 zijn.

## 2. Exportbestand van alle oude bestellingen

De ongeveer 4.780 eerder geïmporteerde bestellingen hebben geen e-mailadres en geen productregels. Die sturen we niet automatisch door, maar lever ik als één bestand aan dat Velopass zelf importeert:

- Alles wat we hebben: ordernummer, datum, status, naam, volledig adres, echt land (geen omzetting naar België meer), betaalreferentie van Mollie, betaald bedrag en de omschrijving "Velopass Frame-ID".
- Geen verzonnen gegevens: geen e-mailadres, geen geschat aantal stickers.
- De 146 bestellingen zonder land en zonder postcode zitten er gewoon in, met een leeg land.
- Je krijgt het als downloadbaar bestand via de knop op de Fulfillment-pagina.

## Technische uitwerking

- **Vergelijking**: `WEB-<order.id>` uit de csv-kolom `external_order_id` afzetten tegen alle `orders` met `b2b_order_id is not null`; enkel het verschil via `pushOrderToB2B(id, { force: true })` opnieuw posten, in blokken van 100.
- **Landfallback**: in `build-payload.server.ts` valt een onbekend land nu terug op `BE`. Dat wordt: land doorgeven zoals opgeslagen (hoofdletters, ISO-2), en weglaten wanneer het leeg is. Raakt enkel de payload, niet de opslag.
- **Backfill-export**: `exportB2BBackfill` in `src/lib/b2b.functions.ts` krijgt een modus `legacy` die orders zonder `order_lines` selecteert en een vereenvoudigde v1-payload bouwt zonder `customer.email` en zonder `items`, met `legacy: true`, `product_name`, `amount_total`, `payment.reference` = `mollie_payment_id` en `fulfilment` uit `order_events` van type `shipped`.
- **Admin**: de bestaande backfillknoppen in `src/routes/_admin/admin.tsx` krijgen er één bij: "Oude bestellingen (JSON)", die het volledige bestand downloadt.
- Geen wijziging aan de webhook; nieuwe betalingen blijven automatisch doorgaan.
