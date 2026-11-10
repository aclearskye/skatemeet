import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSpotChatReportDetail } from "@/lib/admin/hooks/useSpotChatReportDetail";
import type { SpotChatReportItem } from "@/lib/admin/types";
import { C } from "@/lib/theme";
import { styles } from "./SpotChatReportCard.styles";

type Props = {
  item: SpotChatReportItem;
  onDismiss: (reportId: string) => void;
  onRemove: (messageId: string) => void;
  onBan: (item: SpotChatReportItem) => void;
  isBusy: boolean;
};

const SOURCE_LABELS: Record<SpotChatReportItem["source"], string> = {
  user: "REPORTED BY A SKATER",
  filter: "BLOCKED BY FILTER — NOT SENT",
  scan: "AUTO-HIDDEN BY SCAN",
};

function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The text stays hidden until the admin opens it, because opening is what
// gets written to the audit log.
export function SpotChatReportCard({ item, onDismiss, onRemove, onBan, isBusy }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: detail, isLoading, isError } = useSpotChatReportDetail(item.reportId, isOpen);
  const canRemove = item.messageId != null;

  return (
    <View style={styles.card}>
      <View style={styles.textColumn}>
        <View style={[styles.sourceTag, item.isUrgent && styles.sourceTagUrgent]}>
          <Text style={styles.sourceTagText}>{SOURCE_LABELS[item.source]}</Text>
        </View>
        <Text style={styles.username}>
          @{item.senderUsername}
          {item.senderDisplayName ? ` · ${item.senderDisplayName}` : ""}
        </Text>
        <Text style={styles.meta}>
          {item.reason.replace(/_/g, " ").toUpperCase()}
          {item.hitCount > 1 ? ` ×${item.hitCount}` : ""} · {item.spotName.toUpperCase()} ·{" "}
          {formatDateTime(item.lastHitAt).toUpperCase()}
        </Text>
        {item.details ? <Text style={styles.details}>{`"${item.details}"`}</Text> : null}
      </View>

      {!isOpen ? (
        <TouchableOpacity style={styles.viewBtn} onPress={() => setIsOpen(true)} activeOpacity={0.7}>
          <Ionicons name="eye-outline" size={14} color={C.primary} />
          <Text style={styles.viewText}>VIEW MESSAGE (LOGGED)</Text>
        </TouchableOpacity>
      ) : isLoading ? (
        <ActivityIndicator color={C.primary} />
      ) : isError || !detail ? (
        <Text style={styles.removedText}>{"COULDN'T LOAD THIS REPORT"}</Text>
      ) : (
        <View style={styles.thread}>
          {detail.context.map((line) => (
            <View key={`${line.createdAt}-${line.senderId}`} style={styles.contextLine}>
              <Text style={styles.contextAuthor}>
                {line.senderUsername ? `@${line.senderUsername.toUpperCase()}` : "DELETED ACCOUNT"} ·{" "}
                {formatDateTime(line.createdAt).toUpperCase()}
              </Text>
              <Text style={styles.contextBody}>{line.body}</Text>
            </View>
          ))}
          <View style={styles.reportedLine}>
            <Text style={styles.contextAuthor}>
              {item.source === "filter" ? "LATEST BLOCKED ATTEMPT" : "REPORTED MESSAGE"}
            </Text>
            <Text style={styles.reportedBody}>{detail.body ?? "[copy expired]"}</Text>
          </View>
        </View>
      )}

      {item.source !== "filter" && item.messageId == null && (
        <Text style={styles.removedText}>THE ORIGINAL MESSAGE IS ALREADY GONE</Text>
      )}
      {item.messageHeld && (
        <Text style={styles.removedText}>HIDDEN FROM THE CHAT · DISMISSING ALL ITS REPORTS RESTORES IT</Text>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => onDismiss(item.reportId)}
          activeOpacity={0.75}
          disabled={isBusy}
        >
          <Text style={styles.dismissText}>DISMISS</Text>
        </TouchableOpacity>
        {item.source !== "filter" && (
          <TouchableOpacity
            style={[styles.dangerBtn, !canRemove && styles.btnDisabled]}
            onPress={() => item.messageId && onRemove(item.messageId)}
            activeOpacity={0.85}
            disabled={isBusy || !canRemove}
          >
            <Text style={styles.dangerText}>REMOVE</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.dangerBtn, item.senderBanned && styles.btnDisabled]}
          onPress={() => onBan(item)}
          activeOpacity={0.85}
          disabled={isBusy || item.senderBanned}
        >
          <Text style={styles.dangerText}>{item.senderBanned ? "BANNED" : "BAN"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
