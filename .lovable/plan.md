
## Probleem (bevestigd)

`src/_admin/route.tsx` en alle admin server functions gebruiken Auth0's `b2b_admin` role claim voor toegang. Maar `src/lib/users.functions.ts` muteert enkel Supabase (`admin_email_allowlist`, `user_roles`, `supabaseAdmin.auth.admin.inviteUserByEmail`). Gevolg:

- **inviteAdmin**: maakt een Supabase-user aan, kent geen Auth0-role toe → uitgenodigde krijgt "Access restricted".
- **updateMemberRole / removeAdmin**: muteren alleen Supabase-tabellen die niets meer doen → geen effect op echte toegang.
- **listAdmins**: toont Supabase-users, dus UI lijkt correct maar reflecteert niet wie écht admin is.
- **Self-lockout guard** (`data.userId === context.userId`): vergelijkt Supabase UUID met Auth0 `sub` (`auth0|…`) → treedt nooit in werking.

## Vereiste nieuwe secrets (jij zet ze)

Auth0 Management API M2M-app aanmaken in Auth0 dashboard (Applications → Machine to Machine → autoriseer voor Auth0 Management API met scopes `read:users`, `create:users`, `read:roles`, `create:role_members`, `delete:role_members`, `create:user_tickets`), dan:

- `AUTH0_MGMT_CLIENT_ID`
- `AUTH0_MGMT_CLIENT_SECRET`
- `AUTH0_B2B_ADMIN_ROLE_ID` (role-id van de bestaande `b2b_admin` role in Auth0)
- `AUTH0_B2B_STAFF_ROLE_ID` (optioneel, alleen als "staff" ook via Auth0 role gaat)

## Implementatie

1. **Nieuw bestand `src/integrations/auth0/management.server.ts`**
   - `getManagementToken()`: cachet een client-credentials token per domain (in-memory, tot `exp - 60s`).
   - Helpers: `mgmtFetch(path, init)`, `getUserByEmail(email)`, `createUser(email)`, `getUserRoles(sub)`, `assignRole(sub, roleId)`, `removeRole(sub, roleId)`, `createPasswordChangeTicket(sub, resultUrl)`, `listUsersWithRole(roleId)`.

2. **Herwerk `src/lib/users.functions.ts`** (elke functie blijft achter `requireAuth0Admin`):
   - `listAdmins`: haal via `listUsersWithRole(AUTH0_B2B_ADMIN_ROLE_ID)` (+staff role indien gebruikt), retourneer `{ members: [{ sub, email, roles, last_login, created_at }] }`. Drop het `allowlist` veld (of return leeg voor compat).
   - `inviteAdmin`: `getUserByEmail` → indien niet bestaat `createUser` met random password + `email_verified: false` + connection `Username-Password-Authentication` → `assignRole(sub, roleId)` → `createPasswordChangeTicket` en return de ticket URL (UI kan mailen of tonen). Verwijder alle Supabase-mutaties.
   - `updateMemberRole`: `assignRole` / `removeRole` op basis van nieuw vs huidig; **self-lockout guard** vergelijkt `data.sub === context.userId`.
   - `removeAdmin`: `removeRole(sub, adminRoleId)` (+ staff). Self-lockout op `sub`.
   - `getMyRoles`: ongewijzigd (leest al uit Auth0 claims).

3. **UI aanpassen `src/routes/_admin/admin-users.tsx`**:
   - Verstuur `sub` in plaats van Supabase `userId` naar `updateMemberRole` / `removeAdmin`.
   - Toon de `createPasswordChangeTicket` link (of duidelijke "invite mail verstuurd" bevestiging).
   - Verwijder allowlist-tabel uit de UI (Auth0 is nu de bron van waarheid).

4. **Opruimen**: `admin_email_allowlist` tabel en `handle_new_admin_user` trigger/function zijn dood — laat ik voor nu staan (aparte cleanup-migratie later), zodat deze fix puur code is en geen DB-migratie nodig heeft.

## Risico's

- Zonder de 4 secrets crasht `/admin-users`. Ik voeg dezelfde soort `admin_auth_unavailable`-melding toe als `require-admin.ts` doet, zodat de UI het vriendelijk toont.
- Auth0 rate limits op Management API — voor `listUsersWithRole` volstaat 1 call per rol, dus geen probleem.
- Passwordless / social-only users kunnen geen "password change ticket" krijgen — daar tonen we een instructie in plaats van een ticket.

## Volgende stap

Bevestig het plan en zet de 4 Auth0 secrets klaar. Daarna implementeer ik in één beurt.
