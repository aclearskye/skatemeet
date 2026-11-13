import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlaceSearch } from "@/lib/geocoding/hooks/usePlaceSearch";
import type { PlaceResult } from "@/lib/geocoding/types";
import { createStoreForClaim } from "@/lib/storeAccounts/mutations";
import { useStoreOnboardingAction } from "@/lib/storeAccounts/hooks/useStoreOnboardingAction";
import { StoreAccountError } from "@/lib/storeAccounts/types";
import { C } from "@/lib/theme";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { StoreTextField } from "@/components/storeAccount/StoreTextField";
import { styles } from "./NewStoreForm.styles";

type Props = {
  onCancel: () => void;
  onCreated?: () => void;
};

// "My store isn't listed": the store is created hidden and only appears on
// the map once an admin approves the claim.
export function NewStoreForm({ onCancel, onCreated }: Props) {
  const [name, setName] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [address, setAddress] = useState<PlaceResult | null>(null);
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useStoreOnboardingAction(createStoreForClaim);
  const { results, isSearching, isRateLimited, isError } = usePlaceSearch(address ? "" : addressQuery, "address");

  const handleCreate = () => {
    if (name.trim().length < 2) {
      setError("Enter your store's name.");
      return;
    }
    if (!address) {
      setError("Search for your store's address and pick it from the list.");
      return;
    }
    setError(null);
    create.mutate(
      {
        name: name.trim(),
        address: address.label,
        latitude: address.coords.lat,
        longitude: address.coords.lng,
        website: website.trim(),
        phone: phone.trim(),
      },
      {
        onSuccess: () => onCreated?.(),
        onError: (err) => setError(err instanceof StoreAccountError ? err.message : "Couldn't save. Try again."),
      }
    );
  };

  return (
    <View style={styles.container}>
      <StoreTextField label="STORE NAME" value={name} onChangeText={setName} maxLength={120} />

      {address ? (
        <View style={styles.pickedAddress}>
          <Ionicons name="location" size={18} color={C.primary} />
          <Text style={styles.pickedAddressText}>{address.label}</Text>
          <TouchableOpacity onPress={() => setAddress(null)} hitSlop={8}>
            <Text style={styles.change}>CHANGE</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.addressSearch}>
          <StoreTextField
            label="ADDRESS"
            hint="Search, then pick your address from the list"
            value={addressQuery}
            onChangeText={setAddressQuery}
            autoCorrect={false}
          />
          {isSearching ? <ActivityIndicator color={C.primary} style={styles.spinner} /> : null}
          {isRateLimited ? <Text style={styles.error}>Too many searches. Wait a minute and try again.</Text> : null}
          {isError && !isRateLimited ? <Text style={styles.error}>Address search failed. Try again.</Text> : null}
          {results.map((result) => (
            <TouchableOpacity
              key={`${result.label}-${result.coords.lat}`}
              style={styles.result}
              onPress={() => setAddress(result)}
              activeOpacity={0.75}
            >
              <Ionicons name="location-outline" size={16} color={C.muted} />
              <Text style={styles.resultText}>{result.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <StoreTextField
        label="WEBSITE"
        hint="Optional"
        value={website}
        onChangeText={setWebsite}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <StoreTextField label="PHONE" hint="Optional" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <StorePrimaryButton label="ADD MY STORE" onPress={handleCreate} isBusy={create.isPending} />
      <StorePrimaryButton label="BACK TO SEARCH" variant="secondary" onPress={onCancel} />
    </View>
  );
}
