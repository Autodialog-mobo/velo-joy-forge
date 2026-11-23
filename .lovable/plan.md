# VP-887: shop-aanmeldingen via één call naar de Third Party API

## Wat verandert er voor jou
De knop "Doorsturen naar Velopass" in het aanmeldingsbeheer blijft hetzelfde. Achter de schermen gaat de winkel + contactpersoon in één keer naar Velopass, met de exacte locatie (lat/lng) van de winkel. Jouw eigen login wordt niet meer doorgegeven aan Velopass.

## Stappen
1. **Authenticatie** — dezelfde X-API-KEY die we al gebruiken voor de andere calls op thirdpartyapi (opgeslagen op de server). Geen nieuwe credentials nodig.
2. **Geocoderen vóór de push** — het adres (straat, nr, postcode, stad, land) omzetten naar lat/lng via de bestaande Google Maps-koppeling. Geen resultaat of (0, 0) → de push stopt met een duidelijke melding in het beheer ("adres niet gevonden, controleer het adres"), er gaat niets naar Velopass.
3. **Eén call: `POST api/v1/bike-shops`** — winkelvelden zoals vandaag (zonder `type`), `country` als ISO-code of Engelse naam zoals nu, `location { lat, lng }`, en `user { email, firstName, lastName, languageCode, phone? }`.
4. **Weg ermee** — `GET /api/Countries`, alle preflight-zoekacties (naam/btw), `POST /api/Organisations`, `POST /api/users/pro`, de locale-herhaallus en het doorgeven van het Auth0-token.
5. **Antwoorden verwerken**
   - 201: `organisationId`, `publicId`, `proUserId` bewaren bij de aanmelding; status "converted".
   - 409: per conflict in `conflicts`: organisatie-conflict → bestaande `organisationId` / `organisationPublicId` bewaren als "reeds aanwezig"; `bike-shops/user-email-taken` → "gebruiker bestaat al".
   - 400: validatiefout tonen in het beheer, aanmelding blijft open.
   - Overige fouten: status + foutboodschap tonen en loggen.
6. **Testen op staging** met de staging-key (een echte testaanmelding end-to-end), daarna overschakelen naar live.
7. **Velopass verwittigen** zodra het live staat, zodat zij in de prod-logs kunnen nagaan dat er geen `POST /api/Organisations` / `POST /api/users/pro` meer komen.

## Open punten (nodig van Velopass)
- Authenticatie: de bestaande X-API-KEY voor thirdpartyapi (header `X-API-KEY`).
- Basis-URL live: `https://thirdpartyapi.prod.velopass.com` (bevestigd).
- Velden en antwoorden volgen exact de API-specificatie: https://thirdpartyapi.prod.velopass.com/api/docs/#tag/bikeshops

## Technische details
- `src/lib/shop-signups-push-v3.functions.ts`: herschrijven rond één `createBikeShop`-call; admin-check (`requireAuth0Admin`) blijft voor wie mag drukken.
- Nieuw `src/lib/velopass-thirdparty.server.ts`: stuurt de bestaande X-API-KEY mee; kiest staging/live via env. Hergebruikt door de bestaande branding-call waar mogelijk.
- Geocoding via gateway `maps/api/geocode/json` (server-side, één call per push, met 403-afhandeling).
- Migratie op `shop_signups`: kolommen `pushed_to_pro_public_id`, `pushed_to_pro_user_id`, `latitude`, `longitude`; `pushed_to_pro_management_id` blijft voor de organisationId.
- Unit tests (vitest) voor: (0,0)/ontbrekende locatie blokkeert push; 201-mapping; 409 organisatie-conflict → bestaande id; 409 user-email-taken → gebruiker bestaat.
- `AGENTS.md`: regel dat shop-pushes enkel via de Third Party API met server-credentials lopen, nooit met het admin-token.
