# Plan: Verwijder standaardpakket uit create organisation API call

## Probleem
Bij het doorsturen van een shop-aanmelding naar velopass.pro wordt in `src/lib/shop-signups.functions.ts` een `packageId` meegestuurd in de `POST /Organisations` body. Omdat pakketten niet meer in Velopass zitten, retourneert de API nu:

> "Er is geen standaardpakket gevonden in velopass.pro. Stel daar eerst een actief standaardpakket in."

## Oplossing
De `packageId` parameter volledig verwijderen uit de organisatie-aanmaak call:

1. **Verwijder de package lookup helper** (`readDefaultBikeShopPackageId` rond regel 268).
2. **Verwijder de package fetch + validatie** (regels 443-459) die het `packageId` ophaalt en een fout geeft als er geen standaardpakket is.
3. **Verwijder `packageId` uit het request body type** (regel 590) en uit de body zelf (regel 604).
4. **Build en typecheck draaien** om te verifiëren dat er geen resterende verwijzingen zijn.

## Bestanden
- `src/lib/shop-signups.functions.ts`

## Impact
- De `POST /Organisations` call stuurt geen `packageId` meer mee.
- De foutmelding over ontbrekend standaardpakket verdwijnt.
- Geen wijzigingen aan de database, UI of andere API calls.
