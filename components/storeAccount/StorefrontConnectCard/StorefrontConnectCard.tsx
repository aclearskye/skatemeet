import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useMyStorefront } from "@/lib/commerce/hooks/useMyStorefront";
import { useStorefrontConnection } from "@/lib/commerce/hooks/useStorefrontConnection";
import { CommerceError, type StorefrontProvider } from "@/lib/commerce/types";
import { C } from "@/lib/theme";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { StoreTextField } from "@/components/storeAccount/StoreTextField";
import { styles } from "./StorefrontConnectCard.styles";

type Props = {
  // Unpaid stores can't connect or change their shop.
  canEdit: boolean;
};

const PROVIDER_LABEL: Record<StorefrontProvider, string> = { shopify: "SHOPIFY", woocommerce: "WOOCOMMERCE" };

const HELP: Record<StorefrontProvider, string> = {
  shopify:
    "In Shopify admin: Settings → Apps and sales channels → Develop apps → Create an app. Under Storefront API, allow reading products and inventory and writing checkouts, then install it and copy the Storefront API access token.",
  woocommerce:
    "In WordPress: WooCommerce → Settings → Advanced → REST API → Add key, with Read permission only. Copy the consumer key and secret. SkateMeet only uses the key to check this is your site.",
};

// The store's one platform connection: shows it, or the form to make it.
export function StorefrontConnectCard({ canEdit }: Props) {
  const { data: storefront, isLoading } = useMyStorefront();
  const { connect, disconnect } = useStorefrontConnection();
  const [provider, setProvider] = useState<StorefrontProvider>("shopify");
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  if (storefront) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>CONNECTED</Text>
        <Text style={styles.connected}>
          {PROVIDER_LABEL[storefront.provider]} · {storefront.shopName ?? storefront.shopDomain}
        </Text>
        <Text style={styles.hint}>
          {storefront.shopDomain}
          {storefront.currency ? ` · ${storefront.currency}` : ""}
        </Text>
        <StorePrimaryButton
          label="DISCONNECT SHOP"
          variant="secondary"
          onPress={() => setConfirmDisconnect(true)}
          isBusy={disconnect.isPending}
        />
        <ConfirmDialog
          visible={confirmDisconnect}
          title="Disconnect your shop?"
          message="Your products disappear from your store page, and skaters' carts for your store are emptied."
          confirmLabel="DISCONNECT"
          onConfirm={() => {
            setConfirmDisconnect(false);
            disconnect.mutate();
          }}
          onCancel={() => setConfirmDisconnect(false)}
        />
      </View>
    );
  }

  const handleConnect = () => {
    setError(null);
    const payload =
      provider === "shopify"
        ? { provider, domain, token }
        : { provider, domain, consumerKey, consumerSecret };
    connect.mutate(payload, {
      onSuccess: () => {
        setToken("");
        setConsumerKey("");
        setConsumerSecret("");
      },
      onError: (err) => setError(err instanceof CommerceError ? err.message : "Couldn't connect. Try again."),
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>CHOOSE YOUR PLATFORM</Text>
      <View style={styles.tabs}>
        {(["shopify", "woocommerce"] as const).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.tab, provider === option && styles.tabSelected]}
            onPress={() => {
              setProvider(option);
              setError(null);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, provider === option && styles.tabTextSelected]}>{PROVIDER_LABEL[option]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.help}>{HELP[provider]}</Text>

      {provider === "shopify" ? (
        <>
          <StoreTextField
            label="SHOP DOMAIN"
            hint="e.g. your-shop.myshopify.com"
            value={domain}
            onChangeText={setDomain}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <StoreTextField
            label="STOREFRONT API TOKEN"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!showSecrets}
            onToggleSecureEntry={() => setShowSecrets((v) => !v)}
          />
        </>
      ) : (
        <>
          <StoreTextField
            label="SITE ADDRESS"
            hint="e.g. https://yourshop.com"
            value={domain}
            onChangeText={setDomain}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <StoreTextField
            label="CONSUMER KEY"
            hint="Starts with ck_"
            value={consumerKey}
            onChangeText={setConsumerKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <StoreTextField
            label="CONSUMER SECRET"
            hint="Starts with cs_"
            value={consumerSecret}
            onChangeText={setConsumerSecret}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!showSecrets}
            onToggleSecureEntry={() => setShowSecrets((v) => !v)}
          />
        </>
      )}

      {!canEdit ? <Text style={styles.error}>Connecting a shop needs an active subscription.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <StorePrimaryButton label="CONNECT SHOP" onPress={handleConnect} isBusy={connect.isPending} disabled={!canEdit} />
    </View>
  );
}
