## Doel

Een mobile-first herziening van de hele Velopass-site. Niet alleen "kleiner stapelen": echte mobiele patronen (sticky CTA's, bottom sheets, touch-vriendelijke targets, leesbare typografie, snellere visuele hiërarchie).

## Aanpak in fases

Ik werk in volgorde, één fase per beurt zodat je tussendoor kan bijsturen.

### Fase 1 — Fundamenten (eenmalig, raakt elke pagina)
- `src/styles.css`: mobiele typografische schaal (clamp), fluid spacing, container paddings, focus-states, `safe-area-inset` voor iOS notch/home indicator.
- Globale regels: minimum tap-target 44×44, `font-size: 16px` op inputs (voorkomt iOS zoom), `text-wrap: balance` op headings, betere line-height < 480px.
- Utility-klassen voor sticky bottom CTA-bar, bottom-sheet, mobiel-only/desktop-only.
- Snelle audit van overflow-bugs (horizontal scroll) en fix `min-w-0` / `overflow-x: clip` waar nodig.

### Fase 2 — Navigatie & header
- Sticky header verkleinen op scroll (mobiel), hamburger → full-screen panel met grote tap targets, taalswitcher als bottom-sheet, login als secundaire actie.
- Footer: accordion-secties op mobiel i.p.v. lange lijsten.

### Fase 3 — Homepage + hero (`shop.tsx`, `index.tsx`)
- Hero: dashboard-mockup onder de titel op mobiel (niet ernaast), CTA full-width, eyebrow + sub kleiner, achtergrondoverlay aangepast voor portrait.
- Paths-cards: horizontale snap-scroll i.p.v. stapel van 3 grote blokken.
- Benefits: 2-koloms grid → 1-kolom met emoji/icon-bullet ritme.
- Community: kaart krijgt sticky filter-bar + bottom-sheet voor shop details (bestaande `ShopPanel` is al sheet — fine-tune drag-thresholds).
- Sticker-sectie: foto boven, tekst onder, badges in scrollbare rij.

### Fase 4 — Order/checkout (`order.tsx`)
- Bundels: horizontale snap-carousel op mobiel met "POPULAIRST" badge.
- Winkelmandje: collapseert naar **sticky bottom bar** met totaal + "Betalen →"; tik opent volledig sheet met formulier.
- Formulier: inputs 16px, `inputmode`/`autocomplete` correct, postcode/stad op één rij ook op mobiel maar met juiste flex.
- Betaalstadium: full-screen op mobiel met grote terug-knop.

### Fase 5 — Overige pagina's
Pass over: `bike-check`, `contact`, `stolen`, `pro`, `privacy`, `faq`, `guides.buying-second-hand`, `order_.thanks`. Geen redesign per sectie, maar:
- Headings clamp-schaal, secties krijgen mobiel spacing-ritme.
- Tabellen/grids → cards op mobiel.
- Forms krijgen dezelfde inputregels als fase 4.

## Verificatie per fase
- `browser--view_preview` op 390×844 (iPhone) en 360×800 (Android) na elke fase.
- Console + network check.
- Spot-check op 768 tablet om geen regressies te krijgen.

## Wat ik NU ga doen na akkoord
Fase 1 + 2 in één beurt (fundamenten + navigatie), daarna toon ik je het resultaat en wacht ik op je go voor fase 3.

## Technische details
- Geen nieuwe dependencies.
- Tailwind v4 tokens in `src/styles.css` (geen JS-config).
- Bestaande `useIsMobile` hook hergebruiken; nieuwe utility-classes via `@utility`.
- Geen wijzigingen aan i18n keys, backend, server functions, of routes-structuur.
