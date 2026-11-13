import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { fetchEvidenceUrl } from "@/lib/admin/storeClaimQueries";
import type { StoreClaimQueueItem } from "@/lib/admin/types";
import { evidenceFileLabel } from "@/lib/storeAccounts/queries";
import { C } from "@/lib/theme";
import { styles } from "./StoreClaimCard.styles";

type Props = {
  item: StoreClaimQueueItem;
  onDecide: (claimId: string, approve: boolean, notes: string) => void;
  isBusy: boolean;
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function StoreClaimCard({ item, onDecide, isBusy }: Props) {
  const [notes, setNotes] = useState("");
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const openEvidence = async (path: string) => {
    setEvidenceError(null);
    try {
      await WebBrowser.openBrowserAsync(await fetchEvidenceUrl(path));
    } catch {
      setEvidenceError("Couldn't open that document.");
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.badges}>
        {item.kind === "dispute" ? <Text style={[styles.badge, styles.badgeDispute]}>DISPUTE</Text> : null}
        {item.emailDomainMatch ? <Text style={[styles.badge, styles.badgeMatch]}>EMAIL DOMAIN MATCHES</Text> : null}
        <Text style={styles.badge}>{item.isOsmStore ? "OSM STORE" : item.storeCreatedByApplicant ? "NEW STORE" : "USER STORE"}</Text>
      </View>

      <View>
        <Text style={styles.storeName}>{item.storeName}</Text>
        {item.storeAddress ? <Text style={styles.meta}>{item.storeAddress}</Text> : null}
        {item.storeWebsite ? <Text style={styles.meta}>{item.storeWebsite}</Text> : null}
        <Text style={styles.meta}>SUBMITTED {formatDate(item.submittedAt).toUpperCase()}</Text>
      </View>

      {item.kind === "dispute" && item.currentOwnerEmail ? (
        <Text style={styles.warning}>Currently owned by {item.currentOwnerEmail}. Approving transfers the store.</Text>
      ) : null}
      {item.storeCreatedByApplicant ? (
        <Text style={styles.warning}>The applicant created this store. Check that the address is real.</Text>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>BUSINESS</Text>
        <Text style={styles.value}>{item.legalName ?? "No legal name"}</Text>
        <Text style={styles.meta}>Reg/tax no: {item.registrationNumber ?? "—"}</Text>
        <Text style={styles.meta}>
          Contact: {item.contactName ?? "—"}
          {item.contactRole ? ` (${item.contactRole})` : ""}
        </Text>
        <Text style={styles.meta}>Account email: {item.accountEmail}</Text>
        {item.publicPhone ? <Text style={styles.meta}>Public phone: {item.publicPhone}</Text> : null}
        {item.publicEmail ? <Text style={styles.meta}>Public email: {item.publicEmail}</Text> : null}
      </View>

      {item.applicantNote ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APPLICANT NOTE</Text>
          <Text style={styles.value}>{item.applicantNote}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PROOF ({item.evidencePaths.length})</Text>
        {item.evidencePaths.map((path, index) => (
          <TouchableOpacity key={path} style={styles.evidence} onPress={() => openEvidence(path)} activeOpacity={0.75}>
            <Ionicons name="document-text-outline" size={16} color={C.primary} />
            <Text style={styles.evidenceText}>{evidenceFileLabel(path, index)}</Text>
            <Ionicons name="open-outline" size={14} color={C.muted} />
          </TouchableOpacity>
        ))}
        {evidenceError ? <Text style={styles.error}>{evidenceError}</Text> : null}
      </View>

      <TextInput
        style={styles.notes}
        value={notes}
        onChangeText={setNotes}
        placeholder="Note to the business (required to reject)"
        placeholderTextColor={C.muted}
        multiline
        maxLength={1000}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.rejectBtn, notes.trim().length === 0 && styles.disabled]}
          onPress={() => onDecide(item.claimId, false, notes)}
          activeOpacity={0.75}
          disabled={isBusy || notes.trim().length === 0}
        >
          <Text style={styles.rejectText}>REJECT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.approveBtn}
          onPress={() => onDecide(item.claimId, true, notes)}
          activeOpacity={0.85}
          disabled={isBusy}
        >
          <Text style={styles.approveText}>{item.kind === "dispute" ? "APPROVE TRANSFER" : "APPROVE"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
