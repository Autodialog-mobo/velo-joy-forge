# Verwijderen standaardpakket uit create-organisation API-call

## Doel
De push van een shop-aanmelding naar velopass.pro stuurt momenteel een `packageId` mee in de `POST /api/Organisations` body. Omdat pakketten niet meer in Velopass bestaan, levert dit de foutmelding op die de gebruiker ziet. De call moet worden aangepast zodat het pakket helemaal niet meer wordt meegestuurd.

## Huidige situatie (gecontroleerd)
- `src/lib/shop-signups.functions.ts` bevat de functie `readDefaultBikeShopPackageId()` die `GET bike-shop-packages/select` aanroept.
- In `pushShopSignupToVelopassPro` wordt dat pakket-id opgehaald en als `packageId` in de POST-body gezet.
- De foutmelding "Er is geen standaardpakket gevonden in velopass.pro..." komt uit de eigen guard wanneer er geen pakket wordt gevonden.

## Aanpassingen
1. Verwijder de helper `readDefaultBikeShopPackageId()` en de bijbehorende `bike-shop-packages/select` call.
2. Verwijder de package-lookup en de "geen standaardpakket"-foutmelding uit `pushShopSignupToVelopassPro`.
3. Verwijder het veld `packageId` uit:
   - de TypeScript-type-definitie van de POST-body;
   - het daadwerkelijke body-object dat naar `POST /api/Organisations` wordt gestuurd.
4. Laat `type: 1` en de website-payload (`siteUrl`, `siteName`, etc.) ongewijzigd staan.
5. Houd de preflight-logica (bestaande organisatie opzoeken via VAT/company number) intact.

## Testen
- Typecheck/build laten lopen om te verifiëren dat het verwijderen van `packageId` geen typefouten geeft.
- In de admin een shop-aanmelding doorsturen naar velopass.pro en controleren dat de foutmelding over het standaardpakket niet meer verschijnt.

## Bestanden die wijzigen
- `src/lib/shop-signups.functions.ts`
