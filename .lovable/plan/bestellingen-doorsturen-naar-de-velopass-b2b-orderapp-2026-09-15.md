# Bestellingen doorsturen naar de Velopass B2B-orderapp

Alle vier openstaande punten zijn nu beslist, dus de koppeling kan gebouwd worden. De website blijft de winkel en het betaalpunt; de B2B-app wordt het systeem waar de bestelling wordt klaargemaakt en verzonden.

## Wat er gebeurt bij een nieuwe bestelling

1. Klant betaalt op velopass.com (Mollie).
2. Zodra de betaling bevestigd is, stuurt de site de bestelling automatisch door naar Velopass.
3. Velopass stuurt een bevestigingsnummer terug (VPC-...) dat we bij de bestelling bewaren.
4. Lukt het doorsturen niet, dan wordt de bestelling niet geblokkeerd: de klant krijgt gewoon zijn bevestigingsmail, en wij zien in de admin dat de doorsturing nog moet gebeuren.

Dubbel doorsturen kan geen kwaad: Velopass herkent dezelfde bestelling aan onze ordernummer en maakt er nooit twee van.

## Wat we meesturen (volgens de feedback)

- **Naam**: de volledige naam in één veld, precies zoals wij ze bewaren. Niet splitsen.
- **Taal**: de echte taal van de klant, ook Spaans. Geen omzetting naar Engels meer.
- **Verzendkosten**: apart meegestuurd als 1,95 euro, en het totaal is bundels + verzending, exact wat de klant betaalde.
- **Betaalreferentie**: het Mollie-transactienummer, zodat Velopass de betaling live ziet.
- Adres, e-mail, telefoon, bundels (solo/duo/family) met aantallen, en een link naar de bestelling in onze admin.

## Wat je in de admin ziet

Op de fulfillmentpagina komt per bestelling een extra kolom met de doorstuurstatus:
- doorgestuurd (met het Velopass-nummer),
- nog niet doorgestuurd,
- mislukt (met de foutmelding en een knop "opnieuw proberen").

Daarnaast een knop om het eenmalige exportbestand van oude bestellingen te downloaden, eerst beperkt tot 5 bestellingen als proef, daarna het volledige bestand.

## Wat ik van jou nodig heb

De client-id en het geheim voor de testomgeving (en later voor live). Zonder die twee kan er niets verstuurd worden; de rest bouw ik alvast volledig af en zet ik klaar.

## Technische uitwerking

**Opslag** (additieve migratie op `orders`): `b2b_order_id text`, `b2b_pushed_at timestamptz`, `b2b_push_error text`, `b2b_price_flag text`, `b2b_environment text`. Geen kolommen verwijderen of hernoemen.

**Secrets**: `VELOPASS_B2B_CLIENT_ID`, `VELOPASS_B2B_CLIENT_SECRET` (server-only). Basis-URL en audience als constanten; de omgeving (sandbox/live) volgt uit de credential, niet uit de payload.

**`src/lib/b2b/consumer-orders.server.ts`**
- `getB2BToken()`: Auth0 client-credentials tegen `https://velopass.eu.auth0.com/oauth/token`, audience `https://api.b2b-orders`, in-memory cache tot expiry min 5 min.
- `fetchCatalog()`: `GET /consumer-orders/catalog`, 5 minuten cache, levert `catalog_version`.
- `postConsumerOrder(payload)`: `POST /consumer-orders`; 201/200 = succes, 400 = definitieve fout (niet opnieuw proberen), 401 = token verversen en 1x retry, 5xx/netwerk = fout teruggeven voor latere retry.

**`src/lib/b2b/build-payload.server.ts`** — mapping van onze order + `order_lines` naar v1:
- `external_order_id`: `WEB-<order.id>`
- `channel: "website"`, `schema_version: "1.0"`, `currency: "EUR"`
- `customer.name` = `shipping_name`, `customer.language` = `lang` (nl/fr/de/en/es), `locale` = `<lang>-<shipping_country>` met BE als fallback
- `items`: `bundle_key` → `solo|duo|family` met `frame_id_count` 1/2/5, `sku` VP-FRAMEID-..., `unit_price`/`line_total` uit `unit_price_cents`
- `shipping_cost` = `amount_shipping/100`, `amount_total` = `amount_total/100`
- `payment`: `status: paid`, `method` uit `payment_method` (voorvoegsel `mollie:`), `paid_at`, `reference` + `mollie_payment_id` = `mollie_payment_id`
- `catalog_version` uit de catalogusfetch; `metadata.website_order_url` naar de admin
- Alleen `environment = "live"` orders worden automatisch gepusht vanaf de live client.

**Webhook** (`src/routes/api/public/payments/mollie-webhook.ts`): na het bestaande e-mailblok, bij `status === "paid"`, een atomische claim op `b2b_pushed_at` (net als de e-mailclaim). Bij succes `b2b_order_id`/`b2b_price_flag` wegschrijven en een `order_events`-regel `b2b_pushed`; bij fout claim vrijgeven, `b2b_push_error` invullen en loggen. Fout mag de webhookrespons nooit doen falen.

**Server functions** (`src/lib/b2b.functions.ts`, `requireAuth0Admin`): `retryB2BPush({orderId})`, `pushB2BBatch({orderIds})` en `exportB2BBackfill({limit?})` die verzonden orders teruggeeft als v1-payloads plus `fulfilment: { status: "shipped", shipped_at }` (uit `order_events` van type `shipped`, anders `updated_at`).

**Admin** (`src/routes/_admin/admin.tsx`): kolom met doorstuurstatus, retry-actie per order, bulkactie, en downloadknop voor het backfill-JSON (proef met 5, en volledig).

**Test**: zodra de sandbox-credentials er zijn de go-live checklist uit §7 doorlopen (testorder 201, herhaling 200, bewust foute order 400).
