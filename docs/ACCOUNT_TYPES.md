# Account Types

**Read this before any work that touches auth, onboarding, profiles, social features, stores, moderation, ads or permissions.**

SkateMeet is moving from an 18+ app to one that also allows **13–17 year olds**. Every account is one of four types. Each feature has to decide what each type can do.

## The four types

| Type | Who | Social features | Ads | Created via |
|---|---|---|---|---|
| **Child** | 13–17 | **Limited** (see [Child limits](#child-limits)) | **No targeted ads.** Contextual or non-personalised only | Standard onboarding, age gate gives 13–17 |
| **Adult** | 18+ | Full | Targeting allowed | Standard onboarding, age gate gives 18+ |
| **Store** | A skate shop (a business, not a person) | Full | n/a (it's a business account) | **A separate store onboarding flow**, never the Child/Adult flow |
| **Admin** | An Adult with an extra role | Full (same as Adult) | Same as Adult | An existing Adult account is granted the role. It is never self-assigned |

### Child
- Any account whose verified age is 13–17. Under 13 is always refused.
- Social features are limited, and the limits are on by default.
- Ads must never be targeted: no personalisation, behavioural profiling or sharing ad identifiers. Treat Child data as minimal-collection.
- A Child can be **linked to one or more Adult (parent/guardian) accounts**, who can monitor the Child's activity.
- When a Child turns 18 they become an Adult. Decide how this transition happens; see open questions.

### Adult
- Verified age 18+. No social limits. Ads can be targeted, subject to the user's consent and the platform rules (ATT on iOS, the consent framework on web/EU).
- **Parental linking:** an Adult can link to a Child account to monitor that Child's activity. A link is a relationship between two accounts, not a different account type. Any Adult can be a guardian.

### Store
- Represents one physical skate store. It is not a person, so it has no age or guardian.
- **Exclusive claim:** a skate store entity (`UserStore` / `OsmStore` / `SkateStore`, see "Entity" in [CLAUDE.md](../CLAUDE.md)) can be associated with **at most one** Store account. Enforce this in the DB with a unique constraint, not only in app code.
- A Store account can manage its store's **details page**: shop integration, posts and clips.
- No social limits.
- Store onboarding is its own flow, separate from Child/Adult sign-up.

### Admin
- A **role on an Adult account**, not a separate account. It's a flag, not a fourth `account_type` value.
- Admins manage reports (message reports, post moderation, review reports, ban appeals, verification queue).
- A Child or Store account can never be Admin.
- **Only the server/service role can grant it.** The client must never be able to write the flag.

## Rules that apply to every feature

1. **Enforce it on the server.** The account type, the Admin role, Store ownership and guardian links must be enforced in RLS/RPCs. Client checks are only for the UI.
2. **Type and role columns are not client-writable.** `account_type`, `is_admin`, store-claim columns, verification timestamps and age fields change only through `SECURITY DEFINER` RPCs or the service role.
3. **Default to the most restrictive.** If a feature hasn't decided Child behaviour, treat it as off for Children.
4. **Child to Adult interaction is a safety boundary.** Any feature that lets two accounts talk, see each other or be tagged together must state what happens when one side is a Child.
5. **Guardian visibility is read-only monitoring**, unless a feature explicitly adds guardian controls.
6. **New feature checklist.** For each type (Child / Adult / Store / Admin, plus a linked Guardian), say: can they see it, use it, and be the subject of it?

## Child limits

To be decided for each feature. These are the current social surfaces to rule on:

| Surface | Code | Child behaviour |
|---|---|---|
| Direct messages | `lib/messages/` | _TBD_ |
| Friend requests | `lib/friendRequests/` | _TBD_ |
| Follows | `lib/follows/` | _TBD_ |
| Photo/video posts and feed | `lib/posts/`, `lib/feed/` | _TBD_ |
| Being tagged in posts | `lib/posts/` | _TBD_ |
| Profile visibility (`is_private`) | `lib/profiles/` | _TBD (likely private by default)_ |
| Check-ins and location | `lib/checkins/` | _TBD_ |
| Reviews | `lib/spots/`, `lib/stores/` | _TBD_ |
| Push notifications | `lib/notifications/` | _TBD_ |
| Nearby skaters (Search tab, current or chosen location) | `lib/nearby/` | **Off, decided.** A Child can't search nearby, can't appear in results and never has a location reported. Server-enforced: `search_nearby_skaters` and `report_live_location` require `age_confirmed_at`, which only the 18+ gate sets. When the Child band lands, both must refuse Child accounts explicitly, not rely on `age_confirmed_at` alone. See [Nearby skaters checklist](#nearby-skaters-checklist) |
| Spot chats (public group chat per spot/DIY) | `lib/spotChat/` | **Off** until decided. Server-enforced: `_spot_chat_eligible` requires `age_confirmed_at`, which only the 18+ gate sets. When the Child band lands, that helper must refuse Child accounts unless a decision says otherwise |

Fill in this table as decisions are made. It is the reference for Child behaviour.

### Spot chats checklist

One text-only group chat per skate spot and DIY spot (never stores), in `supabase/migrations/20261110120000_spot_chats.sql`.

| Type | See it | Use it | Be the subject of it |
|---|---|---|---|
| Child | No (the join panel says the account can't join) | No | No, they can't post |
| Adult | Yes | Join, leave, post, clear or delete for themselves, report, block | Yes. Others see only their display name and avatar, never their @username or profile |
| Store | Yes (same rule as Adult, needs `age_confirmed_at`) | Same as Adult | Same as Adult. _Open question below_ |
| Admin | Same as Adult in the app | Reads reports in `/admin/reports`, every read is audit-logged | Same as Adult |
| Guardian | Nothing extra. No guardian visibility into spot chats yet | n/a | n/a |

Banned accounts can't join or post, and their existing messages are hidden.

### Nearby skaters checklist

When the search bar is empty, the Search tab lists skaters whose last reported location is near the viewer's current location or a location they choose. Results come in distance bands (no exact order), within 50 km, and load page by page as the viewer scrolls. Distance, coordinates and the time of the last update are never returned. Only a rounded location (about 2 km grid) is stored, in `profile_locations`, which no client can read. Changing the search location is rate-limited and stale locations are dropped.

| Type | See it | Use it | Be the subject of it |
|---|---|---|---|
| Child | No | No | **No.** Never listed, and no location is reported or stored |
| Adult | Yes | Search by current or chosen location. Turn discoverability on or off from the Search tab | Yes, only if public and discoverable. **Private accounts are never listed in nearby results**, even to friends (they still appear in username search under the usual privacy rules) |
| Store | Yes (needs `age_confirmed_at`, same as Adult) | Same as Adult | **Yes for now**, while Store accounts are only partly built. Revisit when Store onboarding lands |
| Admin | Same as Adult. No admin view of anyone's location | Same as Adult | Same as Adult |
| Guardian | Nothing extra. No guardian visibility into a Child's location, since a Child has none stored | n/a | n/a |

Banned accounts, blocked pairs (either direction) and the viewer themself are always excluded.

## Where the code is today

The current model doesn't match the target yet. Check this before building on it.

| Concept | Today | Gap |
|---|---|---|
| Age | `lib/auth/ageGate.ts`: `MIN_AGE = 18`, under-18s refused or banned (`UNDERAGE_BAN_REASON`). Only `profiles.age_confirmed_at` is stored, never the date of birth | Needs a 13–17 band, a stored age band or adult flag (not the DOB) and a re-check on turning 18 |
| Account type | `profiles.account_type`: `'user' \| 'business_pending' \| 'business_verified'` (`supabase/migrations/20260509172735_phase1_business_accounts.sql`, `AccountType` in `lib/context/use-auth-context.tsx`) | `user` must split into Child and Adult. `business_*` becomes Store |
| Store conversion | `components/ui/SwitchToBusinessModal.tsx` converts an existing user account in place | The target is a **separate** Store onboarding flow |
| Store ownership | None. No link between a Store account and a store entity | Needs a store-claim table with a unique index on the store entity |
| Admin | `profiles.is_admin` boolean plus the SQL `is_admin(uuid)` helper used throughout RLS/RPCs | Matches the target model ("role on Adult"). Also enforce "Adult only" |
| Guardian link | None | Needs a link table (adult, child, status, consent) and visibility rules |
| Ads | None | Targeting must be gated on account type |

## Open questions

Record the answers here once they're decided.

- How is a Child's age verified, beyond self-declaration? Is guardian consent required to create a Child account (COPPA doesn't apply at 13+, but GDPR Art. 8 sets 13–16 by country, and the UK Children's Code applies)?
- How is a guardian link established and confirmed? Who can break it, and can a Child see who monitors them?
- What exactly can a guardian see? (Messages? Location/check-ins? Followers?)
- What happens on the 18th birthday? Automatic switch to Adult, and do guardian links end?
- How is a Store verified before it claims a store entity? Who can resolve a disputed claim?
- Can one person own both an Adult account and a Store account?
- Spot chats: may Children ever join? If so, Child-only rooms, or mixed rooms with extra limits (no Adult-to-Child DMs started from a spot chat, stricter filtering)? Should Store accounts post in spot chats, or is that advertising?
