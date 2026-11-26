import { Text } from "react-native";
import { useMyStorefront } from "@/lib/commerce/hooks/useMyStorefront";
import { KeyboardAwareScrollView } from "@/lib/shared/keyboard";
import { useStoreBilling } from "@/lib/storeAccounts/hooks/useStoreBilling";
import type { StoreBilling } from "@/lib/storeAccounts/types";
import { useMyTicketing } from "@/lib/tickets/hooks/useMyTicketing";
import type { MyTicketing } from "@/lib/tickets/types";
import { StoreBillingPanel } from "@/components/storeAccount/StoreBillingPanel";
import { StoreEditorSection } from "@/components/storeAccount/StoreEditorSection";
import { StorefrontConnectCard } from "@/components/storeAccount/StorefrontConnectCard";
import { StoreTicketingCard } from "@/components/storeAccount/StoreTicketingCard";
import { styles } from "./StoreMoneyPanel.styles";

type Props = {
  // Unpaid stores can't set up tickets or a shop until they pay.
  canEdit: boolean;
  bottomInset: number;
};

const BILLING_SUMMARY: Record<string, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment failed, retrying",
  unpaid: "Unpaid",
  canceled: "Ended",
  incomplete_expired: "Ended",
  incomplete: "First payment needs attention",
};

function billingSummary(billing: StoreBilling | undefined): string {
  if (!billing) return "Loading…";
  if (!billing.paymentMethodReady && !billing.hasSubscription) return "Add a payment card";
  return billing.status ? (BILLING_SUMMARY[billing.status] ?? "Set up") : "Setting up";
}

function ticketsSummary(ticketing: MyTicketing | null | undefined): string {
  if (ticketing === undefined) return "Loading…";
  if (!ticketing) return "Not set up";
  if (!ticketing.chargesEnabled) return ticketing.detailsSubmitted ? "Stripe is checking your details" : "Finish Stripe setup";
  const requests = ticketing.pendingRequests;
  return requests > 0 ? `Selling · ${requests} ${requests === 1 ? "request" : "requests"} waiting` : "Selling tickets";
}

// The Money tab: every money-related part of a store account in one place,
// as dropdowns with a one-line status each. A dot marks what needs the owner.
export function StoreMoneyPanel({ canEdit, bottomInset }: Props) {
  const { data: billing } = useStoreBilling();
  const { data: ticketing } = useMyTicketing();
  const { data: storefront } = useMyStorefront();

  const billingAttention = billing != null && (!billing.isPaid || (!billing.paymentMethodReady && !billing.hasSubscription));
  const ticketsAttention =
    ticketing != null &&
    ((!ticketing.chargesEnabled && !ticketing.detailsSubmitted) || ticketing.pendingRequests > 0);
  const shopSummary = storefront
    ? `${storefront.provider === "shopify" ? "Shopify" : "WooCommerce"} · ${storefront.shopName ?? storefront.shopDomain}`
    : "Not connected";

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <StoreEditorSection
        variant="group"
        title="YOUR SUBSCRIPTION"
        summary={billingSummary(billing)}
        attention={billingAttention}
        hint="What you pay SkateMeet. It keeps your page, tickets and shop live."
      >
        <StoreBillingPanel />
      </StoreEditorSection>

      <StoreEditorSection
        variant="group"
        title="TICKETS"
        summary={ticketsSummary(ticketing)}
        attention={ticketsAttention}
        hint="Sell entry (sessions and passes). Skaters pay in the app and the money goes to your own Stripe account."
      >
        <StoreTicketingCard canEdit={canEdit} />
      </StoreEditorSection>

      <StoreEditorSection
        variant="group"
        title="ONLINE SHOP"
        summary={shopSummary}
        hint="Show your Shopify or WooCommerce products. Skaters check out on your shop's own checkout."
      >
        <StorefrontConnectCard canEdit={canEdit} />
      </StoreEditorSection>

      <Text style={styles.footnote}>
        SkateMeet never takes a cut of your ticket or shop sales. Payouts, refunds and receipts are in your Stripe or
        shop dashboard.
      </Text>
    </KeyboardAwareScrollView>
  );
}
