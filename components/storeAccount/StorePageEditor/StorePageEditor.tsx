import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrawer } from "@/lib/context/drawer-context";
import { KeyboardAwareScrollView } from "@/lib/shared/keyboard";
import { useMyStorePage } from "@/lib/storeAccounts/hooks/useMyStorePage";
import { useOpenStorePage } from "@/lib/storeAccounts/hooks/useOpenStorePage";
import { useUpdateStorePage } from "@/lib/storeAccounts/hooks/useUpdateStorePage";
import { StoreAccountError, type MyStorePage, type UpdateStorePagePayload } from "@/lib/storeAccounts/types";
import { C } from "@/lib/theme";
import { StoreBillingPanel } from "@/components/storeAccount/StoreBillingPanel";
import { StoreImagePicker } from "@/components/storeAccount/StoreImagePicker";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { StoreTextField } from "@/components/storeAccount/StoreTextField";
import { styles } from "./StorePageEditor.styles";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// An approved Store account's Profile tab: edits the official layer of its
// store page. Opening hours and facilities are edited on the public page
// itself (the same sheet the community used before the claim).
export function StorePageEditor() {
  const insets = useSafeAreaInsets();
  const { data: page, isLoading, isError, refetch } = useMyStorePage();

  return (
    <View style={styles.container}>
      <EditorHeader topInset={insets.top} />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : isError || !page ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>COULDN&apos;T LOAD YOUR STORE PAGE</Text>
          <StorePrimaryButton label="TRY AGAIN" variant="secondary" onPress={() => refetch()} />
        </View>
      ) : (
        // Keyed so a refetch after saving resets the form to the saved page.
        <EditorForm key={JSON.stringify(page)} page={page} bottomInset={insets.bottom} />
      )}
    </View>
  );
}

function EditorHeader({ topInset }: { topInset: number }) {
  const { openDrawer } = useDrawer();
  return (
    <View style={[styles.header, { paddingTop: topInset + 12 }]}>
      <View style={styles.headerText}>
        <Text style={styles.heading}>YOUR STORE</Text>
        <Text style={styles.subheading}>{"// manage your store page"}</Text>
      </View>
      <TouchableOpacity onPress={openDrawer} hitSlop={12} accessibilityLabel="Open menu">
        <Ionicons name="menu" size={24} color={C.text} />
      </TouchableOpacity>
    </View>
  );
}

function EditorForm({ page, bottomInset }: { page: MyStorePage; bottomInset: number }) {
  const [form, setForm] = useState<UpdateStorePagePayload>({
    name: page.name,
    description: page.description ?? "",
    website: page.website ?? "",
    publicPhone: page.publicPhone ?? "",
    publicEmail: page.publicEmail ?? "",
    logoPath: page.logoPath,
    coverPath: page.coverPath,
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const save = useUpdateStorePage();
  const { openStorePage, isOpening } = useOpenStorePage();

  const set = <TKey extends keyof UpdateStorePagePayload>(key: TKey, value: UpdateStorePagePayload[TKey]) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (form.name.trim().length < 2) {
      setError("Enter your store's name.");
      return;
    }
    if (form.publicEmail.trim() && !EMAIL_REGEX.test(form.publicEmail.trim())) {
      setError("Enter a valid store email, or leave it empty.");
      return;
    }
    setError(null);
    save.mutate(form, {
      onSuccess: () => setSaved(true),
      onError: (err) => setError(err instanceof StoreAccountError ? err.message : "Couldn't save. Try again."),
    });
  };

  const followers = `${page.followerCount} ${page.followerCount === 1 ? "follower" : "followers"}`;

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.summary}>
        <Text style={styles.summaryName}>{page.name}</Text>
        <Text style={styles.muted}>{page.address}</Text>
        <Text style={styles.muted}>{followers}</Text>
      </View>
      <StorePrimaryButton
        label="VIEW PUBLIC PAGE"
        variant="secondary"
        isBusy={isOpening}
        onPress={() => openStorePage({ storeId: page.storeId, osmPlaceId: page.osmPlaceId })}
      />
      <Text style={styles.hint}>Edit opening hours and facilities from your public page.</Text>

      <StoreBillingPanel />
      {!page.canEdit ? (
        <Text style={styles.error}>Page editing is paused until your subscription is paid. You can still change opening hours.</Text>
      ) : null}

      <StoreTextField label="STORE NAME" value={form.name} onChangeText={(v) => set("name", v)} maxLength={120} />
      <StoreTextField
        label="ABOUT"
        hint="What you stock, who you are. Optional."
        value={form.description}
        onChangeText={(v) => set("description", v)}
        multiline
        maxLength={2000}
      />
      <StoreTextField
        label="WEBSITE"
        hint="Starts with https://"
        value={form.website}
        onChangeText={(v) => set("website", v)}
        autoCapitalize="none"
        keyboardType="url"
        maxLength={300}
      />
      <StoreTextField
        label="STORE PHONE"
        value={form.publicPhone}
        onChangeText={(v) => set("publicPhone", v)}
        keyboardType="phone-pad"
        maxLength={40}
      />
      <StoreTextField
        label="STORE EMAIL"
        value={form.publicEmail}
        onChangeText={(v) => set("publicEmail", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        maxLength={254}
      />
      <StoreImagePicker label="LOGO" shape="square" path={form.logoPath} onChange={(p) => set("logoPath", p)} />
      <StoreImagePicker label="COVER PHOTO" shape="wide" path={form.coverPath} onChange={(p) => set("coverPath", p)} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.saved}>Saved.</Text> : null}
      <StorePrimaryButton label="SAVE PAGE" onPress={handleSave} isBusy={save.isPending} disabled={!page.canEdit} />
    </KeyboardAwareScrollView>
  );
}
