import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMessageReportDetail } from "@/lib/admin/hooks/useMessageReportDetail";
import type { MessageReportItem } from "@/lib/admin/types";
import { C } from "@/lib/theme";
import { styles } from "./MessageReportCard.styles";

type Props = {
  item: MessageReportItem;
  onDismiss: (reportId: string) => void;
  onRemove: (messageId: string) => void;
  onBan: (item: MessageReportItem) => void;
  isBusy: boolean;
};

function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The message content stays hidden until the admin opens it, because
// opening a report is what gets written to the audit log.
export function MessageReportCard({ item, onDismiss, onRemove, onBan, isBusy }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: detail, isLoading, isError } = useMessageReportDetail(item.reportId, isOpen);

  return (
    <View style={styles.card}>
      <View style={styles.textColumn}>
        <Text style={styles.username}>@{item.senderUsername}</Text>
        <Text style={styles.meta}>
          {item.reason.replace(/_/g, " ").toUpperCase()} · {formatDateTime(item.createdAt).toUpperCase()}
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
                {line.senderId === item.senderId ? `@${item.senderUsername.toUpperCase()}` : "REPORTER"} ·{" "}
                {formatDateTime(line.createdAt).toUpperCase()}
              </Text>
              <Text style={styles.contextBody}>{line.body}</Text>
            </View>
          ))}
          <View style={styles.reportedLine}>
            <Text style={styles.contextAuthor}>REPORTED MESSAGE</Text>
            <Text style={styles.reportedBody}>{detail.body ?? "[copy expired]"}</Text>
          </View>
        </View>
      )}

      {item.messageId == null && <Text style={styles.removedText}>THE ORIGINAL MESSAGE IS ALREADY GONE</Text>}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => onDismiss(item.reportId)}
          activeOpacity={0.75}
          disabled={isBusy}
        >
          <Text style={styles.dismissText}>DISMISS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dangerBtn, item.messageId == null && styles.btnDisabled]}
          onPress={() => item.messageId && onRemove(item.messageId)}
          activeOpacity={0.85}
          disabled={isBusy || item.messageId == null}
        >
          <Text style={styles.dangerText}>REMOVE</Text>
        </TouchableOpacity>
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
