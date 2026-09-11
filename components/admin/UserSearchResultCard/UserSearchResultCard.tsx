import { useBanHistory } from "@/lib/admin/hooks/useBanHistory";
import type { ProfileSearchResult } from "@/lib/admin/types";
import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./UserSearchResultCard.styles";

type Props = {
  result: ProfileSearchResult;
  onBan: (result: ProfileSearchResult) => void;
  onUnban: (result: ProfileSearchResult) => void;
  isBusy: boolean;
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function UserSearchResultCard({ result, onBan, onUnban, isBusy }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const { data: history = [], isLoading: isLoadingHistory } = useBanHistory(
    showHistory ? result.profileId : null
  );

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.textColumn}>
          <Text style={styles.username} numberOfLines={1}>
            @{result.username}
          </Text>
          {result.displayName && (
            <Text style={styles.displayName} numberOfLines={1}>
              {result.displayName}
            </Text>
          )}
        </View>
        <View style={styles.badges}>
          {result.isAdmin && (
            <View style={[styles.badge, styles.adminBadge]}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          )}
          {result.isBanned && (
            <View style={[styles.badge, styles.bannedBadge]}>
              <Text style={styles.bannedBadgeText}>BANNED</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => setShowHistory((v) => !v)}
          activeOpacity={0.75}
        >
          <Text style={styles.historyBtnText}>{showHistory ? "HIDE HISTORY" : "VIEW HISTORY"}</Text>
        </TouchableOpacity>

        {!result.isAdmin &&
          (result.isBanned ? (
            <TouchableOpacity
              style={styles.unbanBtn}
              onPress={() => onUnban(result)}
              activeOpacity={0.85}
              disabled={isBusy}
            >
              <Text style={styles.unbanText}>UNBAN</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.banBtn}
              onPress={() => onBan(result)}
              activeOpacity={0.85}
              disabled={isBusy}
            >
              <Text style={styles.banText}>BAN</Text>
            </TouchableOpacity>
          ))}
      </View>

      {showHistory && (
        <View style={styles.historySection}>
          {isLoadingHistory ? (
            <ActivityIndicator color={C.muted} style={{ marginVertical: 8 }} />
          ) : history.length === 0 ? (
            <Text style={styles.historyEmpty}>No ban history.</Text>
          ) : (
            history.map((item) => (
              <View key={item.banId} style={styles.historyRow}>
                <Ionicons
                  name={item.unbannedAt ? "checkmark-circle-outline" : "ban-outline"}
                  size={14}
                  color={item.unbannedAt ? C.muted : C.error}
                />
                <View style={styles.historyText}>
                  <Text style={styles.historyReason}>{item.reason}</Text>
                  <Text style={styles.historyMeta}>
                    BANNED BY @{item.bannedByUsername} · {formatDate(item.bannedAt)}
                    {item.unbannedAt && item.unbannedByUsername
                      ? ` · UNBANNED BY @${item.unbannedByUsername} · ${formatDate(item.unbannedAt)}`
                      : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}
