import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import type { CsamHoldItem } from "@/lib/admin/types";
import { C } from "@/lib/theme";
import { styles } from "./CsamHoldCard.styles";

type Props = {
  item: CsamHoldItem;
  onMarkFiled: (holdId: string, reference: string) => void;
  isBusy: boolean;
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Deliberately shows no media: evidence stays locked in the
// moderation-evidence bucket. This card only tracks the NCA report.
export function CsamHoldCard({ item, onMarkFiled, isBusy }: Props) {
  const [reference, setReference] = useState("");
  const isFiled = item.ncaReportStatus === "filed";

  return (
    <View style={[styles.card, !isFiled && styles.cardToFile]}>
      <Text style={styles.status}>{isFiled ? "NCA REPORT FILED" : "NCA REPORT TO FILE"}</Text>
      <Text style={styles.meta}>@{(item.username ?? "deleted").toUpperCase()} · HELD {formatDate(item.createdAt)}</Text>
      <Text style={styles.meta}>POST {item.postId}</Text>

      {isFiled ? (
        <Text style={styles.meta}>
          REF {item.ncaReference} · {item.filedAt ? formatDate(item.filedAt) : ""}
        </Text>
      ) : (
        <View style={styles.fileRow}>
          <TextInput
            style={styles.input}
            placeholder="NCA reference"
            placeholderTextColor={C.muted}
            value={reference}
            onChangeText={setReference}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.fileBtn, (!reference.trim() || isBusy) && styles.fileBtnDisabled]}
            onPress={() => onMarkFiled(item.holdId, reference.trim())}
            disabled={!reference.trim() || isBusy}
            activeOpacity={0.85}
          >
            <Text style={styles.fileText}>MARK FILED</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
