# Sprint 2 — String-extractie plan

## Scope
3 pages naar 4 talen tillen (EN als bron, NL/FR/DE als placeholders met `_translated: false`):

| Page | Regels | Namespace | Reset nodig? |
|---|---|---|---|
| `$lang/stolen.tsx` | 1253 | `stolen` | Ja — eerdere refactor was gerevert; huidige file is NL-hardcoded. EN-bundle bestaat alleen met meta-stub |
| `$lang/contact.tsx` | 726 | `contact` | Nee — bundle ontbreekt nog volledig, page heeft 9 bestaande t()-calls |
| `$lang/order_.thanks.tsx` | 163 | `order-thanks` | Nee — bundle ontbreekt, page heeft 3 bestaande t()-calls |

## Werkwijze per page (identiek aan sprint 1)
1. Page volledig lezen om alle UI-strings te inventariseren
2. **NL-bundle eerst** schrijven naar `src/i18n/locales/nl/<ns>.json` (originele bron-taal van stolen, EN voor de andere twee)
3. **EN-bundle** schrijven (vertaling van NL voor stolen; bron voor contact/order-thanks)
4. **FR + DE placeholder-bundles** kopiëren met `_translated: false`
5. Component refactoren naar `useTranslation("<ns>")` + `t()`-calls. Structuur met genummerde steps blijft een structured array zoals bij privacy.
6. Verificatie: browser test op /nl, /en, /fr, /de met console open — geen missing-key warnings, geen hydration errors

## Wat blijft hardcoded (per stap 6A-briefing)
- Merknamen: Velopass, Frame-ID
- Partnernamen: Police-on-web, MyBike, Joule, Mollie
- Bedragen: € 19, € 29 etc.
- Adressen / e-mails / telefoonnummers: support@velopass.com, +32 471 60 15 73, BTW-nummers
- WhatsApp-nummer in contact-page
- App-URLs: app.velopass.com, login URLs
- Mollie payment-ID's en order-data in thanks-page (dynamisch)

## Volgorde + tussenrapport
Ik stel voor in deze volgorde, met **tussenverificatie na elke page** zodat we niet één grote untested batch krijgen:

1. **order-thanks** eerst (163 regels, kleinste — snelle validatie van het patroon)
2. **contact** (726 regels — middel, 2 tabs)
3. **stolen** (1253 regels — grootste, structured steps array)

Per page rapporteer ik:
- (a) EN-bundle compleet ✅
- (b) NL/FR/DE placeholders bestaan ✅
- (c) Page rendert console-clean op alle 4 talen ✅

## Verwachte omvang
~30–45 tool calls totaal verspreid over de 3 pages. Stolen alleen al is ~15–20 calls door de omvang. Wil je dat ik:

**A.** Alles in één doorloop afhandel (zelfde turn, lang antwoord, ik werk de drie pages sequentieel af en rapporteer per page tussentijds)?

**B.** Per page in aparte turns — ik doe nu order-thanks volledig + verificatie, jij bevestigt, dan contact, dan stolen?

Optie B geeft je tussentijdse review-momenten; A is sneller maar minder controle. Laat me weten welke je wilt — bij geen voorkeur ga ik voor B (kleinste eerst, dan opbouwen).
