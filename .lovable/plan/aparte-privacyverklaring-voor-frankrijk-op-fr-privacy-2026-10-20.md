# Aparte privacyverklaring voor Frankrijk op /fr/privacy

## Wat de gebruiker ziet
- Bovenaan /fr/privacy dezelfde landkeuze als op /fr/terms: **France** (standaard) en **Autres pays**.
- **France** toont de nieuwe Franse tekst uit de bijlage, met "Dernière mise à jour : 12 octobre 2026".
- **Autres pays** toont het huidige Franse privacybeleid, ongewijzigd.
- Keuze staat in het adres (`/fr/privacy?pays=autres`); zonder parameter: Frankrijk.
- NL, EN, DE, ES blijven ongewijzigd, zonder landkeuze.

## Tekst
- Vanaf "Politique de confidentialité" wordt de bijlage 1-op-1 letterlijk overgenomen (titels, alinea's, tussenkopjes, lijsten; tabellen zoals finalité / base légale als leesbare lijst of tabel).
- De vergelijkingstabel bovenaan de bijlage (Article actuel / Problème / Modification) is een interne toelichting en wordt **niet** getoond.
- E-mailadressen (bv. support@velopass.com) worden klikbaar.

## Technische details
- `src/i18n/locales/fr/privacy.json`: nieuwe `_fr_country`-blok (label, france, other, last_updated, sections), net als in terms.json; bestaande `sections` blijft "autres pays".
- `src/routes/$lang/privacy.tsx`: zelfde `validateSearch` (`pays`), landkeuze-knoppen en sectiekeuze als terms.tsx; Section-type uitbreiden met `paragraphs` en eventueel subkoppen/tabel-rijen. Head/SEO ongewijzigd.
- Validatie: `validate:i18n` draaien en visueel controleren op /fr/privacy en /fr/privacy?pays=autres.
- Niet publiceren.
