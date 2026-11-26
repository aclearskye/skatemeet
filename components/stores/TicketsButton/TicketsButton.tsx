import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { C } from "@/lib/theme";

// Opens My tickets. Hidden for Store accounts, which can't buy tickets.
export function TicketsButton() {
  const router = useRouter();
  const { profile } = useAuthContext();

  if (!profile || profile.account_type === "store") return null;

  return (
    <TouchableOpacity onPress={() => router.push("/tickets" as never)} hitSlop={10} accessibilityLabel="My tickets">
      <Ionicons name="ticket-outline" size={24} color={C.text} />
    </TouchableOpacity>
  );
}
