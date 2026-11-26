import { RatingBar } from "@/components/common/RatingBar";
import { SOCIAL_URL, type SocialNetwork, type StorePageStyle } from "@/lib/storeAccounts/pageStyle";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Fragment } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  osmRating: number | null;
  address: string | null;
  hours: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  // A claimed store's social handles (its page style).
  socials?: Pick<StorePageStyle, SocialNetwork>;
  // The page's accent; a claimed store can pick its own.
  accent?: string;
};

const SOCIAL_ICONS: Record<SocialNetwork, keyof typeof Ionicons.glyphMap> = {
  instagram: "logo-instagram",
  tiktok: "logo-tiktok",
  youtube: "logo-youtube",
};

export function StoreInfoBlock({
  osmRating,
  address,
  hours,
  phone,
  website,
  description,
  socials,
  accent = C.secondary,
}: Props) {
  const socialRows = (Object.keys(SOCIAL_ICONS) as SocialNetwork[])
    .map((network) => ({ network, handle: socials?.[network] ?? null }))
    .filter((row): row is { network: SocialNetwork; handle: string } => row.handle != null);

  return (
    <Fragment>
      {osmRating != null && <RatingBar label="RATING" value={osmRating} accent={accent} />}

      {description != null && description !== "" && (
        <Text style={styles.description}>{description}</Text>
      )}

      <View style={styles.infoSection}>
        {address !== "" && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={accent} />
            <Text style={styles.infoText}>{address}</Text>
          </View>
        )}
        {hours != null && hours !== "" && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={accent} />
            <Text style={styles.infoText}>{hours}</Text>
          </View>
        )}
        {phone != null && phone !== "" && (
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => Linking.openURL(`tel:${phone}`)}
            activeOpacity={0.75}
          >
            <Ionicons name="call-outline" size={16} color={accent} />
            <Text style={[styles.infoText, styles.infoLink, { color: accent }]}>{phone}</Text>
          </TouchableOpacity>
        )}
        {website != null && website !== "" && (
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() =>
              Linking.openURL(website.startsWith("http") ? website : `https://${website}`)
            }
            activeOpacity={0.75}
          >
            <Ionicons name="globe-outline" size={16} color={accent} />
            <Text style={[styles.infoText, styles.infoLink, { color: accent }]} numberOfLines={1}>
              {website}
            </Text>
          </TouchableOpacity>
        )}
        {socialRows.map(({ network, handle }) => (
          <TouchableOpacity
            key={network}
            style={styles.infoRow}
            onPress={() => Linking.openURL(SOCIAL_URL[network](handle))}
            activeOpacity={0.75}
            accessibilityLabel={`${network} @${handle}`}
          >
            <Ionicons name={SOCIAL_ICONS[network]} size={16} color={accent} />
            <Text style={[styles.infoText, styles.infoLink, { color: accent }]} numberOfLines={1}>
              @{handle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Fragment>
  );
}

const styles = StyleSheet.create({
  description: { fontFamily: F.body, fontSize: 15, color: C.text, lineHeight: 24 },
  infoSection: { gap: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderVariant },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoText: { fontFamily: F.body, fontSize: 14, color: C.text, flex: 1, lineHeight: 22 },
  infoLink: { textDecorationLine: "underline" },
});
