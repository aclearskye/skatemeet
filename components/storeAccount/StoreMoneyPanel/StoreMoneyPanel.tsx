import { Text } from "react-native";
import { KeyboardAwareScrollView } from "@/lib/shared/keyboard";
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

// The Money tab: every money-related part of a store account in one place,
// what the store pays SkateMeet and the two ways it gets paid.
export function StoreMoneyPanel({ canEdit, bottomInset }: Props) {
  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <StoreEditorSection
        variant="group"
        title="YOUR SUBSCRIPTION"
        hint="What you pay SkateMeet. It keeps your page, tickets and shop live."
      >
        <StoreBillingPanel />
      </StoreEditorSection>

      <StoreEditorSection
        variant="group"
        title="TICKETS"
        hint="Sell entry (sessions and passes). Skaters pay in the app and the money goes to your own Stripe account."
      >
        <StoreTicketingCard canEdit={canEdit} />
      </StoreEditorSection>

      <StoreEditorSection
        variant="group"
        title="ONLINE SHOP"
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
