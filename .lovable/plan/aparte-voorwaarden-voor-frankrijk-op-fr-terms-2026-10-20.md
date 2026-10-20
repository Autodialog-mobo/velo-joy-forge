# Aparte voorwaarden voor Frankrijk op /fr/terms

## Wat de gebruiker ziet
- Bovenaan /fr/terms komt een landkeuze met twee opties: **France** (standaard) en **Autres pays**.
- **France** toont de nieuwe Franse tekst uit de bijlage (met de FNUCI-/APIC-vermeldingen en verwijzingen naar de Franse wet).
- **Autres pays** toont de huidige Franse tekst, ongewijzigd.
- De keuze staat in het adres (`/fr/terms?pays=autres`), zodat je een directe link naar elke versie kan delen. Zonder parameter: Frankrijk.
- De andere talen (NL, EN, DE, ES) blijven zoals ze zijn, zonder landkeuze.

## Tekst
- De bijlage wordt 1-op-1 letterlijk overgenomen, met dezelfde opbouw (titel, alinea's, lijsten, modelformulier).
- De markeringen `[MOD]` in de bijlage zijn interne aanduidingen voor gewijzigde stukken en worden **niet** getoond.
- Datum op de Frankrijk-versie: "Dernière mise à jour : 12 octobre 2026".

## Technische details
- Nieuwe sleutel `sections_fr_country` (plus eventueel `country_label`, `country_france`, `country_other`) in `src/i18n/locales/fr/terms.json`; bestaande `sections` blijft de "autres pays"-versie.
- `src/routes/$lang/terms.tsx`: `validateSearch` voor `pays` ("france" | "autres"); landkeuze (gestyled als bestaande knoppen, twee segmenten) alleen renderen als `lang === "fr"`; kiest de juiste sectielijst. Head/SEO ongewijzigd (canonical blijft /fr/terms).
- Validatie: `validate:i18n` draaien (extra FR-only sleutels mogen niet als ontbrekend in andere talen falen; zo nodig `_fr_only`-uitzondering) en visueel controleren op /fr/terms en /fr/terms?pays=autres.
- Niet publiceren.
