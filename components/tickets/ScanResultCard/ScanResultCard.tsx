import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scanDetail, scanHeadline, type ScanOutcome, type ScanResult } from "@/lib/tickets/scanTypes";
import { ticketValidityLabel } from "@/lib/tickets/types";
import { ageFrom, type ScanWaiver } from "@/lib/tickets/waiverTypes";
import { C } from "@/lib/theme";
import { TapeChip } from "@/components/common/TapeChip";
import { SpotChatAvatar } from "@/components/spotChat/SpotChatAvatar";
import { styles } from "./ScanResultCard.styles";

type Props = {
  result: ScanResult;
};

const OUTCOME: Record<ScanOutcome, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  admitted: { bg: C.primary, fg: C.onPrimary, icon: "checkmark-circle" },
  already_checked_in: { bg: C.gold, fg: C.onGold, icon: "time" },
  refused: { bg: C.error, fg: C.onError, icon: "close-circle" },
};

// What staff see after a scan: a big yes/no, then who the skater is and
// which ticket it was. A shared screenshot shows the real owner's photo.
export function ScanResultCard({ result }: Props) {
  const tone = OUTCOME[result.outcome];
  const { skater, ticket } = result;

  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={[styles.banner, { backgroundColor: tone.bg }]}>
        <Ionicons name={tone.icon} size={28} color={tone.fg} />
        <Text style={[styles.headline, { color: tone.fg }]}>{scanHeadline(result)}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.detail}>{scanDetail(result)}</Text>

        {skater ? (
          <View style={styles.skater}>
            <SpotChatAvatar name={skater.displayName} avatarUrl={skater.avatarUrl} size={64} />
            <View style={styles.skaterText}>
              <Text style={styles.name} numberOfLines={1}>
                {skater.displayName}
              </Text>
              {skater.username ? <Text style={styles.muted}>@{skater.username}</Text> : null}
              {skater.under18 ? (
                <TapeChip text="UNDER 18" colors={{ bg: C.tapeOrange, fg: C.onTapeOrange }} size="sm" />
              ) : null}
            </View>
          </View>
        ) : null}

        {result.waiver ? <WaiverBlock waiver={result.waiver} /> : null}

        {ticket ? (
          <View style={styles.ticket}>
            <Text style={styles.ticketName}>{ticket.name}</Text>
            <Text style={styles.muted}>
              {ticket.kind === "session" ? "One entry · " : "Pass · "}
              {ticketValidityLabel(ticket)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// The signed waiver (with the emergency contact staff may need), or a
// warning when the store has a waiver this skater didn't sign (a ticket
// bought before the waiver was added).
function WaiverBlock({ waiver }: { waiver: ScanWaiver }) {
  if (!waiver.signed) {
    if (!waiver.required) return null;
    return (
      <View style={[styles.waiver, styles.waiverMissing]}>
        <Text style={styles.waiverTitle}>NO WAIVER SIGNED</Text>
        <Text style={styles.muted}>This ticket was bought before your waiver was added. Get them to sign in person.</Text>
      </View>
    );
  }
  const signedOn = new Date(waiver.signedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return (
    <View style={styles.waiver}>
      <Text style={styles.waiverTitle}>
        WAIVER SIGNED · V{waiver.version} · {signedOn.toUpperCase()}
      </Text>
      <Text style={styles.waiverLine}>
        {waiver.fullName} · age {ageFrom(waiver.dateOfBirth)} ({waiver.dateOfBirth})
      </Text>
      <Text style={styles.muted}>
        Emergency: {waiver.emergencyName}, {waiver.emergencyPhone}
      </Text>
    </View>
  );
}
