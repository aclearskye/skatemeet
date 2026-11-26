import { useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { isApprovedStoreProfile } from "@/lib/storeAccounts/types";
import { useRedeemTicket } from "@/lib/tickets/hooks/useRedeemTicket";
import type { ScanResult } from "@/lib/tickets/scanTypes";
import { TicketsError } from "@/lib/tickets/types";
import { C } from "@/lib/theme";
import { BackButton } from "@/components/common/BackButton";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { ScanResultCard } from "@/components/tickets/ScanResultCard";
import BurgerButton from "@/components/ui/BurgerButton";
import { styles } from "./TicketScanner.styles";

type Props = {
  // In the store's bottom tab bar: the menu button instead of a back arrow,
  // and the tab bar sits below, so no bottom inset.
  inTab: boolean;
};

// The store's till scanner: point the camera at a skater's ticket QR code
// and see straight away whether to let them in. Scanning pauses on each
// result until staff tap Scan next, so one code is never read twice. The
// camera only runs while this screen is showing (a tab stays mounted).
export function TicketScanner({ inTab }: Props) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const router = useRouter();
  const { profile } = useAuthContext();
  const [permission, requestPermission] = useCameraPermissions();
  const redeem = useRedeemTicket();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paused = result != null || error != null || redeem.isPending;

  const handleScan = ({ data }: BarcodeScanningResult) => {
    if (paused) return;
    redeem.mutate(data, {
      onSuccess: setResult,
      onError: (err) =>
        setError(err instanceof TicketsError ? err.message : "Couldn't check that ticket. Check the connection and try again."),
    });
  };

  const scanNext = () => {
    setResult(null);
    setError(null);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {inTab ? null : <BackButton />}
        <View style={styles.headerText}>
          <Text style={styles.heading}>SCAN TICKETS</Text>
          <Text style={styles.subheading}>{"// point at a skater's QR code"}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push("/store-checkins" as never)}
          activeOpacity={0.8}
          accessibilityLabel="Check-in list"
        >
          <Ionicons name="list-outline" size={16} color={C.text} />
          <Text style={styles.headerButtonText}>CHECK-INS</Text>
        </TouchableOpacity>
        {inTab ? <BurgerButton /> : null}
      </View>

      {!isApprovedStoreProfile(profile) ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>ONLY AN APPROVED STORE CAN SCAN TICKETS</Text>
        </View>
      ) : !permission ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : !permission.granted ? (
        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={40} color={C.muted} />
          <Text style={styles.prompt}>SkateMeet needs your camera to scan entry tickets.</Text>
          <View style={styles.promptButton}>
            {permission.canAskAgain ? (
              <StorePrimaryButton label="ALLOW CAMERA" onPress={() => requestPermission()} />
            ) : (
              <StorePrimaryButton label="OPEN SETTINGS" onPress={() => Linking.openSettings()} />
            )}
          </View>
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          {isFocused ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={paused ? undefined : handleScan}
            />
          ) : null}
          <View style={styles.frame} pointerEvents="none" />

          <View style={[styles.sheet, { paddingBottom: inTab ? 16 : insets.bottom + 16 }]}>
            {redeem.isPending ? (
              <View style={styles.checking}>
                <ActivityIndicator color={C.primary} />
                <Text style={styles.checkingText}>Checking ticket…</Text>
              </View>
            ) : result ? (
              <ScanResultCard result={result} />
            ) : error ? (
              <Text style={styles.error}>{error}</Text>
            ) : (
              <Text style={styles.hint}>Hold the skater&apos;s QR code inside the square.</Text>
            )}
            {result || error ? <StorePrimaryButton label="SCAN NEXT" onPress={scanNext} /> : null}
          </View>
        </View>
      )}
    </View>
  );
}
