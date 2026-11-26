import { StoreMoneyPanel } from "@/components/storeAccount/StoreMoneyPanel";
import { StorePageForm } from "@/components/storeAccount/StorePageForm";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { useDrawer } from "@/lib/context/drawer-context";
import { useMyStorePage } from "@/lib/storeAccounts/hooks/useMyStorePage";
import { useOpenStorePage } from "@/lib/storeAccounts/hooks/useOpenStorePage";
import { useStoreMoneyAttention } from "@/lib/storeAccounts/hooks/useStoreMoneyAttention";
import { storeImageUrl } from "@/lib/storeAccounts/queries";
import type { MyStorePage } from "@/lib/storeAccounts/types";
import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./StorePageEditor.styles";

type EditorTab = "page" | "money";

// The last tab picked, kept for the session so coming back from Stripe (or
// any remount) reopens it. On web the URL's ?tab= also survives the reload
// a Stripe redirect causes.
let lastTab: EditorTab = "page";

const isEditorTab = (value: unknown): value is EditorTab => value === "page" || value === "money";

const TABS: { key: EditorTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "page", label: "PAGE", icon: "brush-outline" },
  { key: "money", label: "MONEY", icon: "cash-outline" },
];

// An approved Store account's Profile tab. Page: everything skaters see on
// the store page. Money: the subscription, tickets and online shop.
export function StorePageEditor() {
  const insets = useSafeAreaInsets();
  const { data: page, isLoading, isError, refetch } = useMyStorePage();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTabState] = useState<EditorTab>(isEditorTab(params.tab) ? params.tab : lastTab);
  const setTab = (next: EditorTab) => {
    lastTab = next;
    setTabState(next);
    router.setParams({ tab: next });
  };

  return (
    <View style={styles.container}>
      <EditorHeader topInset={insets.top} />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : isError || !page ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>{"COULDN'T LOAD YOUR STORE PAGE"}</Text>
          <StorePrimaryButton label="TRY AGAIN" variant="secondary" onPress={() => refetch()} />
        </View>
      ) : (
        <>
          <StoreSummary page={page} />
          <EditorTabs tab={tab} onChange={setTab} />
          {/* Both stay mounted so switching tabs never loses unsaved page edits. */}
          <View style={[styles.pane, tab !== "page" && styles.hidden]}>
            {/* Keyed so a refetch after saving resets the form to the saved page. */}
            <StorePageForm key={JSON.stringify(page)} page={page} />
          </View>
          <View style={[styles.pane, tab !== "money" && styles.hidden]}>
            <StoreMoneyPanel canEdit={page.canEdit} bottomInset={insets.bottom} />
          </View>
        </>
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
      </View>
      <TouchableOpacity onPress={openDrawer} hitSlop={12} accessibilityLabel="Open menu">
        <Ionicons name="menu" size={24} color={C.text} />
      </TouchableOpacity>
    </View>
  );
}

// Logo, name and followers, with a shortcut to the public page.
function StoreSummary({ page }: { page: MyStorePage }) {
  const { openStorePage, isOpening } = useOpenStorePage();
  const followers = `${page.followerCount} ${page.followerCount === 1 ? "follower" : "followers"}`;

  return (
    <View style={styles.summary}>
      {page.logoPath ? (
        <Image source={{ uri: storeImageUrl(page.logoPath) }} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.logoPlaceholder]}>
          <Ionicons name="storefront-outline" size={20} color={C.muted} />
        </View>
      )}
      <View style={styles.summaryText}>
        <Text style={styles.summaryName} numberOfLines={1}>
          {page.name}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {followers} · {page.address}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => openStorePage({ storeId: page.storeId, osmPlaceId: page.osmPlaceId })}
        disabled={isOpening}
        activeOpacity={0.8}
        accessibilityLabel="View your public page"
      >
        {isOpening ? (
          <ActivityIndicator color={C.text} size="small" />
        ) : (
          <>
            <Ionicons name="eye-outline" size={14} color={C.text} />
            <Text style={styles.viewText}>VIEW</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function EditorTabs({ tab, onChange }: { tab: EditorTab; onChange: (tab: EditorTab) => void }) {
  const moneyNeedsAttention = useStoreMoneyAttention();

  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {TABS.map(({ key, label, icon }) => {
        const selected = tab === key;
        const showDot = key === "money" && moneyNeedsAttention;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.tab, selected && styles.tabSelected]}
            onPress={() => onChange(key)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={showDot ? `${label}, needs attention` : label}
          >
            <Ionicons name={icon} size={16} color={selected ? C.onPrimary : C.text} />
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{label}</Text>
            {showDot ? <View style={styles.dot} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
