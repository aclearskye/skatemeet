import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./NotificationTabs.styles";

export type NotificationTab = "all" | "requests";

type Props = {
  activeTab: NotificationTab;
  onTabChange: (tab: NotificationTab) => void;
  pendingRequestCount: number;
};

export function NotificationTabs({ activeTab, onTabChange, pendingRequestCount }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "all" && styles.tabActive]}
        onPress={() => onTabChange("all")}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>NOTIFICATIONS</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "requests" && styles.tabActive]}
        onPress={() => onTabChange("requests")}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === "requests" && styles.tabTextActive]}>
          REQUESTS{pendingRequestCount > 0 ? ` · ${pendingRequestCount}` : ""}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
