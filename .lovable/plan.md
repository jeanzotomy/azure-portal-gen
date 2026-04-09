

## Plan: Admin MFA Toggle Per User

### Goal
Allow the admin to disable (reset) or see MFA status for each user from the Users management panel. When disabled, the user will need to re-enroll MFA on their next login.

### Approach

**1. New Edge Function: `manage-user-mfa`**
- Create `supabase/functions/manage-user-mfa/index.ts`
- Accepts `{ user_id, action: "list" | "unenroll" }` 
- Verifies the caller is an admin (same pattern as `delete-user`)
- Uses the Supabase Admin API (`adminClient.auth.admin.mfa.listFactors` / `deleteFactor`) to list or remove MFA factors for a given user
- Returns MFA status (enrolled or not) for "list", confirms removal for "unenroll"

**2. Update AdminUsers component in `src/pages/AdminPage.tsx`**
- Add state to track MFA status per user (`Record<string, boolean>`)
- On load, call the edge function with `action: "list"` for all users (or batch)
- Display a shield/lock icon or switch on each user card showing MFA status (Activé / Désactivé)
- Add a button to reset/disable MFA for a user (with confirmation dialog)
- After reset, refresh MFA status

### Technical Details

**Edge Function (`manage-user-mfa/index.ts`)**:
- CORS headers, OPTIONS handling
- Auth check: extract caller from JWT, verify admin role via `has_role`
- For `action: "list"`: call `adminClient.auth.admin.mfa.listFactors({ userId })`, return `{ enrolled: boolean, factors: [...] }`
- For `action: "unenroll"`: call `adminClient.auth.admin.mfa.deleteFactor({ userId, factorId })` for each verified factor, return success

**UI changes**:
- Add a small MFA indicator (shield icon green/gray) on each user card
- Add a "Désactiver MFA" button that calls the edge function with `action: "unenroll"` after confirmation
- Toast feedback on success/error

### Files Changed
- **New**: `supabase/functions/manage-user-mfa/index.ts`
- **Edit**: `src/pages/AdminPage.tsx` (AdminUsers component)

