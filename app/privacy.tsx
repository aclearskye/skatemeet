import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C, F } from "@/lib/theme";

// Drafted from md/messaging_and_privacy.md. Must be reviewed by someone
// legally qualified -- and DRAFT_NOTICE / CONTACT filled in or removed --
// before launch.
const DRAFT_NOTICE = "DRAFT — PENDING LEGAL REVIEW";
const CONTACT = "[privacy contact address — add before launch]";
const LAST_UPDATED = "14 November 2026";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "WHO CAN USE SKATEMEET",
    body: [
      "You must be 18 or older. We ask for your date of birth when you sign up, check it on your device, and only store the fact that you confirmed it — never the date itself.",
      "If an existing account confirms a date of birth under 18, it is deactivated rather than deleted, so you can appeal if it was a mistake. An account with no appeal, or whose appeal is denied, may be permanently deleted after 30 days.",
    ],
  },
  {
    title: "WHAT WE COLLECT",
    body: [
      "Your account: email, username, name, display name, city, bio, pronouns, disciplines, skill level and avatar.",
      "What you add: spots and stores, reviews, photos, clips, favourites, votes, check-ins and the streaks and XP they earn.",
      "Social: friend requests, friendships, blocks you make, chats and messages, and reports you file.",
    ],
  },
  {
    title: "YOUR PROFILE",
    body: [
      "Profiles start public: any signed-in skater can see your profile and find you in search. Turn on Private account in Settings and only your friends can — non-friends see just your name and avatar, so they can send a friend request. Your name still appears on public reviews you've written.",
      "Photos you upload (including your avatar) are stored at public links, so anyone with the link can open them even if your profile is private.",
    ],
  },
  {
    title: "NEARBY SKATERS",
    body: [
      "Search shows skaters whose last location is near you, or near a city you pick. To do that, while you use the app we store an approximate location for you (rounded to an area about 2 km across, never your exact position) and keep it for up to 30 days. Nobody can see it, and no one is ever shown how far away you are.",
      "You start discoverable. Tap DISCOVERABLE on the Search tab to hide yourself; your stored location is deleted straight away and you can still search. Private accounts are never shown in nearby search and their location is never stored.",
      "When you search around a place, we keep a rough record of the areas you searched (to about 1 km) for a day, to limit how often the search location can change. When you search for a city, we keep only the time of each search, for an hour, to limit how often it can be used; what you typed isn't stored. City searches are looked up through Photon, an OpenStreetMap service, which receives the text you type but not who you are.",
    ],
  },
  {
    title: "MESSAGES",
    body: [
      "Only friends can message each other. Messages are stored on our servers and are not end-to-end encrypted; only the people in a chat can read it, apart from the moderation cases below.",
      "Clearing or deleting a chat removes it for you only — the other skater keeps their copy. Once everyone in a chat has cleared a message, we delete it, and a chat nobody is left in is deleted entirely.",
      "If you unfriend someone, the history stays for both of you but neither of you can send new messages.",
      "Later we may send push notifications for new messages; these would be delivered through Apple or Google.",
    ],
  },
  {
    title: "BLOCKING",
    body: [
      "Blocking someone ends your friendship, stops messages and friend requests both ways, and hides your profiles from each other. We record that you blocked them; they are never told.",
    ],
  },
  {
    title: "REPORTS AND MODERATION",
    body: [
      "When you report a message, we save a copy of it and up to five messages before it so a moderator can review it, even if the chat is later cleared. Moderators don't see who reported it, and every time a moderator opens a report it is logged.",
      "Those copies are deleted 90 days after the report is resolved; only the outcome is kept.",
    ],
  },
  {
    title: "DELETING YOUR ACCOUNT",
    body: [
      "Settings → Deactivate account deletes your account straight away, along with your messages, chats, friendships, blocks, reports you filed, reports about your messages, and everything else listed above. People you chatted with keep only the messages they sent.",
    ],
  },
  {
    title: "GETTING YOUR DATA",
    body: [
      "Settings → Download my data gives you a copy of everything we hold about you as a JSON file, once an hour.",
      "To protect other people, it doesn't include reports others made about you, blocks others made against you, or our internal moderation logs.",
    ],
  },
  {
    title: "CONTACT",
    body: [`Questions or requests about your data: ${CONTACT}`],
  },
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>PRIVACY POLICY</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.draft}>{DRAFT_NOTICE}</Text>
        <Text style={styles.updated}>LAST UPDATED {LAST_UPDATED.toUpperCase()}</Text>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 30,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  draft: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.secondary,
    letterSpacing: 1,
  },
  updated: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
    marginTop: -14,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
    letterSpacing: 1.5,
  },
  paragraph: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.textVariant,
    lineHeight: 21,
  },
});
