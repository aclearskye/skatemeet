import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useToast } from "@/lib/context/toast-context";
import { KeyboardAwareScrollView } from "@/lib/shared/keyboard";
import { useUpdateStorePage } from "@/lib/storeAccounts/hooks/useUpdateStorePage";
import {
  accentColors,
  MAX_ANNOUNCEMENT_LENGTH,
  normaliseHandle,
  SOCIAL_PATTERNS,
  STORE_KIND_LABEL,
  type FeaturedSection,
  type SocialNetwork,
  type StorePageStyle,
} from "@/lib/storeAccounts/pageStyle";
import { StoreAccountError, type MyStorePage, type UpdateStorePagePayload } from "@/lib/storeAccounts/types";
import { TAPE_LABEL_COLORS } from "@/lib/shared/tapeLabels";
import { TapeChip } from "@/components/common/TapeChip";
import { StoreEditorSection } from "@/components/storeAccount/StoreEditorSection";
import { StoreHoursEditor } from "@/components/storeAccount/StoreHoursEditor";
import { StoreImagePicker } from "@/components/storeAccount/StoreImagePicker";
import { StoreLookFields } from "@/components/storeAccount/StoreLookFields";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { StoreTextField } from "@/components/storeAccount/StoreTextField";
import { styles } from "./StorePageForm.styles";

type Props = {
  page: MyStorePage;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SOCIAL_FIELDS: { network: SocialNetwork; label: string; hint: string }[] = [
  { network: "instagram", label: "INSTAGRAM", hint: "@handle or profile link" },
  { network: "tiktok", label: "TIKTOK", hint: "@handle or profile link" },
  { network: "youtube", label: "YOUTUBE", hint: "@handle or channel link" },
];

const FEATURED: { value: FeaturedSection; label: string }[] = [
  { value: "tickets", label: "TICKETS FIRST" },
  { value: "shop", label: "SHOP FIRST" },
];

function toForm(page: MyStorePage): UpdateStorePagePayload {
  return {
    name: page.name,
    description: page.description ?? "",
    website: page.website ?? "",
    publicPhone: page.publicPhone ?? "",
    publicEmail: page.publicEmail ?? "",
    logoPath: page.logoPath,
    coverPath: page.coverPath,
    style: page.style,
  };
}

// The Page tab: everything a skater sees on the store page, grouped the way
// it appears there. One Save bar for the whole page.
export function StorePageForm({ page }: Props) {
  const initial = useMemo(() => toForm(page), [page]);
  const [form, setForm] = useState<UpdateStorePagePayload>(initial);
  const [error, setError] = useState<string | null>(null);
  const save = useUpdateStorePage();
  const { showToast } = useToast();
  const isDirty = JSON.stringify(form) !== JSON.stringify(initial);
  const accent = accentColors(form.style.accent);

  const set = <TKey extends keyof UpdateStorePagePayload>(key: TKey, value: UpdateStorePagePayload[TKey]) => {
    setError(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const setStyle = (patch: Partial<StorePageStyle>) => {
    setError(null);
    setForm((prev) => ({ ...prev, style: { ...prev.style, ...patch } }));
  };

  const handleSave = () => {
    if (form.name.trim().length < 2) return setError("Enter your store's name.");
    if (form.publicEmail.trim() && !EMAIL_REGEX.test(form.publicEmail.trim())) {
      return setError("Enter a valid store email, or leave it empty.");
    }
    const style = { ...form.style, announcement: form.style.announcement?.trim() || null };
    for (const { network, label } of SOCIAL_FIELDS) {
      const handle = style[network] ? normaliseHandle(style[network]!) : "";
      if (handle && !SOCIAL_PATTERNS[network].test(handle)) return setError(`Check your ${label.toLowerCase()} handle.`);
      style[network] = handle || null;
    }
    setError(null);
    save.mutate(
      { ...form, style },
      {
        // The page refetches and the form resets to it, so the bar goes.
        onSuccess: () => showToast({ message: "PAGE SAVED", variant: "success" }),
        onError: (err) => setError(err instanceof StoreAccountError ? err.message : "Couldn't save. Try again."),
      }
    );
  };

  const announcementLength = form.style.announcement?.length ?? 0;
  // One line per closed section, so the tab reads at a glance.
  const labelCount = form.style.tapeLabels.length;
  const lookSummary = `${STORE_KIND_LABEL[form.style.storeKind]} · ${labelCount} ${labelCount === 1 ? "label" : "labels"} · ${TAPE_LABEL_COLORS[form.style.accent].name}`;
  const contactSummary =
    [form.website.trim(), form.publicPhone.trim(), form.publicEmail.trim()].filter(Boolean).join(" · ") ||
    "Nothing added yet";
  const socialSummary =
    SOCIAL_FIELDS.map(({ network }) => form.style[network])
      .filter(Boolean)
      .map((handle) => `@${normaliseHandle(handle ?? "")}`)
      .join(" · ") || "None added";

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!page.canEdit ? (
          <Text style={styles.error}>
            Page editing is paused until your subscription is paid (see Money). You can still change opening hours.
          </Text>
        ) : null}

        <StoreEditorSection
          title="NOTICE"
          summary={form.style.announcement?.trim() || "No notice"}
          hint="Pinned to the top of your page in your page colour. Leave empty to hide it."
        >
          <StoreTextField
            label={`NOTICE · ${announcementLength}/${MAX_ANNOUNCEMENT_LENGTH}`}
            hint='e.g. "Closed Saturday for the comp. Back Sunday 10am."'
            value={form.style.announcement ?? ""}
            onChangeText={(v) => setStyle({ announcement: v })}
            multiline
            maxLength={MAX_ANNOUNCEMENT_LENGTH}
          />
        </StoreEditorSection>

        <StoreEditorSection
          title="OPENING HOURS"
          summary="Your weekly hours"
          hint="Saved on their own with Save hours, even while your subscription is unpaid."
        >
          <StoreHoursEditor storeId={page.storeId} osmPlaceId={page.osmPlaceId} />
        </StoreEditorSection>

        <StoreEditorSection title="LOOK" summary={lookSummary} hint="How your page's hero reads at a glance.">
          <StoreLookFields style={form.style} onChange={setStyle} />
        </StoreEditorSection>

        <StoreEditorSection title="NAME & PHOTOS" summary={form.name}>
          <StoreTextField label="STORE NAME" value={form.name} onChangeText={(v) => set("name", v)} maxLength={120} />
          <StoreImagePicker label="LOGO" shape="square" path={form.logoPath} onChange={(p) => set("logoPath", p)} />
          <StoreImagePicker label="COVER PHOTO" shape="wide" path={form.coverPath} onChange={(p) => set("coverPath", p)} />
        </StoreEditorSection>

        <StoreEditorSection title="ABOUT & CONTACT" summary={contactSummary}>
          <StoreTextField
            label="ABOUT"
            hint="What you stock or run, who you are. Optional."
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
        </StoreEditorSection>

        <StoreEditorSection title="SOCIALS" summary={socialSummary} hint="Shown with your contact details. Optional.">
          {SOCIAL_FIELDS.map(({ network, label, hint }) => (
            <StoreTextField
              key={network}
              label={label}
              hint={hint}
              value={form.style[network] ?? ""}
              onChangeText={(v) => setStyle({ [network]: v })}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={120}
            />
          ))}
        </StoreEditorSection>

        <StoreEditorSection
          title="LAYOUT"
          summary={form.style.featuredSection === "shop" ? "Shop first" : "Tickets first"}
          hint="Which comes first on your page, if you sell both."
        >
          <View style={styles.chips} accessibilityRole="radiogroup">
            {FEATURED.map(({ value, label }) => (
              <TapeChip
                key={value}
                text={label}
                colors={accent}
                active={form.style.featuredSection === value}
                onPress={() => setStyle({ featuredSection: value })}
                accessibilityRole="radio"
                accessibilityState={{ checked: form.style.featuredSection === value }}
              />
            ))}
          </View>
        </StoreEditorSection>

        <Text style={styles.hint}>Facilities are edited on your public page.</Text>
      </KeyboardAwareScrollView>

      {/* Only when there's something to save (or a save to report on). */}
      {isDirty || save.isPending || error ? (
        <View style={styles.saveBar}>
          <Text style={[styles.saveStatus, error ? styles.error : null]} numberOfLines={2}>
            {error ?? "Unsaved changes"}
          </Text>
          <View style={styles.saveButton}>
            <StorePrimaryButton
              label="SAVE PAGE"
              onPress={handleSave}
              isBusy={save.isPending}
              disabled={!page.canEdit || !isDirty}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
