import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useClaimableStoreSearch } from "@/lib/storeAccounts/hooks/useClaimableStoreSearch";
import { useStoreOnboardingAction } from "@/lib/storeAccounts/hooks/useStoreOnboardingAction";
import { chooseStoreToClaim } from "@/lib/storeAccounts/mutations";
import { StoreAccountError, type ClaimableStore } from "@/lib/storeAccounts/types";
import { C } from "@/lib/theme";
import { NewStoreForm } from "@/components/storeAccount/NewStoreForm";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { styles } from "./ClaimStoreStep.styles";

type Props = {
  onCancel?: () => void;
  // Called once a store is chosen or added.
  onDone?: () => void;
};

// Search OSM and user-created stores, or add a new one. Picking an owned
// store is allowed: the claim is filed as a dispute for an admin to decide.
export function ClaimStoreStep({ onCancel, onDone }: Props) {
  const [query, setQuery] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { results, isSearching, isError, enabled } = useClaimableStoreSearch(query);
  const choose = useStoreOnboardingAction((store: ClaimableStore) => chooseStoreToClaim(store.storeId, store.osmPlaceId));

  if (isAddingNew) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>ADD YOUR STORE</Text>
        <NewStoreForm onCancel={() => setIsAddingNew(false)} onCreated={onDone} />
      </View>
    );
  }

  const handleChoose = (store: ClaimableStore) => {
    setError(null);
    choose.mutate(store, {
      onSuccess: () => onDone?.(),
      onError: (err) => setError(err instanceof StoreAccountError ? err.message : "Couldn't choose that store. Try again."),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FIND YOUR STORE</Text>
      <Text style={styles.hint}>Search by your store&apos;s name as it appears on the SkateMeet map.</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={C.muted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Store name"
          placeholderTextColor={C.muted}
          autoCorrect={false}
        />
        {isSearching ? <ActivityIndicator color={C.primary} /> : null}
      </View>

      {isError ? <Text style={styles.error}>Search failed. Try again.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {enabled && !isSearching && results.length === 0 && !isError ? (
        <Text style={styles.hint}>No stores match. You can add yours below.</Text>
      ) : null}

      {results.map((store) => (
        <TouchableOpacity
          key={store.storeId ?? store.osmPlaceId}
          style={styles.result}
          onPress={() => handleChoose(store)}
          disabled={choose.isPending}
          activeOpacity={0.75}
        >
          <View style={styles.resultText}>
            <Text style={styles.resultName}>{store.name}</Text>
            {store.address ? <Text style={styles.resultMeta}>{store.address}</Text> : null}
            {store.isOwned ? (
              <Text style={styles.owned}>ALREADY CLAIMED. YOU CAN FILE A DISPUTE WITH PROOF</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </TouchableOpacity>
      ))}

      <StorePrimaryButton label="MY STORE ISN'T LISTED" variant="secondary" onPress={() => setIsAddingNew(true)} />
      {onCancel ? <StorePrimaryButton label="CANCEL" variant="secondary" onPress={onCancel} /> : null}
    </View>
  );
}
