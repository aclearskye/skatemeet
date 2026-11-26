#!/usr/bin/env node
// Create (or repair) one test login per account state, for the in-app DEV
// account switcher (components/devTools/DevAccountSwitcher). The list of
// accounts is lib/devTools/devAccounts.json; every account shares one password.
//
//   node scripts/seed-dev-accounts.mjs [--lat=53.4831 --lng=-2.2339] [--reset-stores]
//
// Requires in .env.local:
//   SUPABASE_SERVICE_ROLE_KEY  (Supabase Dashboard → Settings → API)
//   DEV_ACCOUNT_PASSWORD       (12+ chars; the switcher asks for it once per device)
//
// Safe to re-run. Accounts that exist get their password and account state put
// back to what the preset describes. A store's claim is rebuilt only when it's
// not already in the expected state (or with --reset-stores), so a storefront
// you connected by hand survives (it hangs off the profile, not the store).
// Stripe ids are fakes: billing portal and checkout calls fail for these stores.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.DEV_ACCOUNT_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase Dashboard → Settings → API)");
  process.exit(1);
}
if (!PASSWORD || PASSWORD.length < 12) {
  console.error("Add DEV_ACCOUNT_PASSWORD (12+ characters) to .env.local");
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
// Default: Stevenson Square, Manchester.
const LAT = args.lat ? parseFloat(args.lat) : 53.4831;
const LNG = args.lng ? parseFloat(args.lng) : -2.2339;
const RESET_STORES = args["reset-stores"] === true;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const accounts = JSON.parse(readFileSync(new URL("../lib/devTools/devAccounts.json", import.meta.url), "utf8"));

function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { users } = must(await supabase.auth.admin.listUsers({ page, perPage: 1000 }), "listUsers");
    const match = users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (users.length < 1000) return null;
  }
}

async function ensureUser({ email }, isStore) {
  const existing = await findUserByEmail(email);
  if (existing) {
    must(
      await supabase.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true }),
      `update ${email}`,
    );
    return existing.id;
  }
  const { user } = must(
    await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      // handle_new_user reads this to make the profile a Store account.
      user_metadata: isStore ? { signup_kind: "store" } : {},
    }),
    `create ${email}`,
  );
  return user.id;
}

function skaterProfile(key, label, { onboarded = true, ageConfirmed = true, admin = false } = {}) {
  const username = `dev_${key.replace(/[^a-z0-9]/g, "")}`;
  return {
    account_type: "user",
    is_admin: admin,
    first_name: onboarded ? "Dev" : null,
    last_name: onboarded ? label : null,
    username: onboarded ? username : null,
    display_name: onboarded ? `Dev ${label}` : null,
    onboarding_completed: onboarded,
    age_confirmed_at: ageConfirmed ? new Date().toISOString() : null,
    is_private: false,
  };
}

async function updateProfile(profileId, fields) {
  must(await supabase.from("profiles").update(fields).eq("profile_id", profileId), `profile ${profileId}`);
}

async function setBan(profileId, banned, adminId) {
  must(
    await supabase.from("user_bans").update({ unbanned_at: new Date().toISOString(), unbanned_by: adminId })
      .eq("profile_id", profileId).is("unbanned_at", null),
    "clear bans",
  );
  if (banned) {
    must(
      await supabase.from("user_bans").insert({ profile_id: profileId, reason: "Dev test account", banned_by: adminId }),
      "insert ban",
    );
  }
}

// status: 'pending' | 'approved'. billing: null (card saved, no subscription) | 'active' | 'unpaid'.
async function ensureStore(profileId, label, status, billing, adminId) {
  const { data: claim } = await supabase
    .from("store_claims").select("claim_id, status").eq("profile_id", profileId)
    .in("status", ["draft", "pending", "approved"]).maybeSingle();

  if (RESET_STORES || claim?.status !== status) {
    must(await supabase.from("store_claims").delete().eq("profile_id", profileId), "delete claims");
    must(await supabase.from("user_stores").delete().eq("profile_id", profileId), "delete stores");
    // A revoke trigger may have cleared it; the approval trigger sets it back.
    await updateProfile(profileId, {
      account_type: "store", is_admin: false, onboarding_completed: false,
      username: null, display_name: null, age_confirmed_at: null,
    });

    const name = `Dev Skate Shop (${label})`;
    must(
      await supabase.from("store_business_details").upsert({
        profile_id: profileId, legal_name: `${name} LLC`, registration_number: "DEV-0000",
        contact_name: "Dev Owner", contact_role: "Owner",
      }),
      "business details",
    );
    must(await supabase.from("store_public_details").upsert({ profile_id: profileId }), "public details");

    const store = must(
      await supabase.from("user_stores").insert({
        profile_id: profileId, name, address: "Stevenson Square, Northern Quarter, Manchester", latitude: LAT, longitude: LNG, pending_claim: true,
      }).select("store_id").single(),
      "create store",
    );
    const created = must(
      await supabase.from("store_claims").insert({
        profile_id: profileId, store_id: store.store_id, kind: "claim", status: "pending",
        submitted_at: new Date().toISOString(), applicant_note: "Dev test claim",
      }).select("claim_id").single(),
      "create claim",
    );

    if (status === "approved") {
      // Same writes as admin_review_store_claim. The status update fires the
      // trigger that gives the account its username and routes it to the app.
      must(
        await supabase.from("store_claims").update({
          status: "approved", reviewed_by: adminId, reviewed_at: new Date().toISOString(),
        }).eq("claim_id", created.claim_id),
        "approve claim",
      );
      must(
        await supabase.from("user_stores").update({ pending_claim: false, is_verified: true }).eq("store_id", store.store_id),
        "publish store",
      );
    }
  }

  must(
    await supabase.from("store_billing").upsert({
      profile_id: profileId,
      stripe_customer_id: `cus_devseed_${profileId.slice(0, 8)}`,
      payment_method_ready: true,
      stripe_subscription_id: billing ? `sub_devseed_${profileId.slice(0, 8)}` : null,
      status: billing,
      updated_at: new Date().toISOString(),
    }),
    "billing",
  );
}

async function main() {
  console.log(`Seeding ${accounts.length} dev accounts into ${SUPABASE_URL}`);
  const byKey = Object.fromEntries(accounts.map((a) => [a.key, a]));
  const isStore = (key) => key.startsWith("store-");

  // The admin goes first: bans and store approvals need a reviewer.
  const adminId = await ensureUser(byKey.admin, false);
  await updateProfile(adminId, skaterProfile("admin", byKey.admin.label, { admin: true }));

  for (const account of accounts) {
    if (account.key === "admin") continue;
    const id = await ensureUser(account, isStore(account.key));
    switch (account.key) {
      case "new":
        await updateProfile(id, skaterProfile(account.key, account.label, { onboarded: false, ageConfirmed: false }));
        break;
      case "agecheck":
        await updateProfile(id, skaterProfile(account.key, account.label, { ageConfirmed: false }));
        break;
      case "store-pending":
        await ensureStore(id, "pending", "pending", null, adminId);
        break;
      case "store-approved":
        await ensureStore(id, "approved", "approved", "active", adminId);
        break;
      case "store-unpaid":
        await ensureStore(id, "unpaid", "approved", "unpaid", adminId);
        break;
      default:
        await updateProfile(id, skaterProfile(account.key, account.label));
    }
    if (!isStore(account.key)) await setBan(id, account.key === "banned", adminId);
    console.log(`  ✓ ${account.label.padEnd(26)} ${account.email}`);
  }
  console.log("Done. Open the DEV button in the app and enter DEV_ACCOUNT_PASSWORD once.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
