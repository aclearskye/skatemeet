import {
  createEmptyMetadataFormState,
  EntityMetadataStep,
  metadataFormStateFromMetadata,
  metadataFormStateToPayload,
  MetadataFormState,
} from "@/components/common/EntityMetadataStep";
import { EntityMetadataBase, UpsertMetadataPayload } from "@/lib/shared/types";
import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./EditMetadataSheet.styles";

type Props = {
  visible: boolean;
  onClose: () => void;
  initialValue: EntityMetadataBase | null;
  accent: string;
  onAccent: string;
  onSubmit: (payload: UpsertMetadataPayload) => Promise<void>;
};

export function EditMetadataSheet({
  visible,
  onClose,
  initialValue,
  accent,
  onAccent,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState<MetadataFormState>(createEmptyMetadataFormState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setValue(metadataFormStateFromMetadata(initialValue));
      setErrorMsg(null);
    }
  }, [visible, initialValue]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit(metadataFormStateToPayload(value));
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Failed to save details. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>EDIT DETAILS</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <EntityMetadataStep value={value} onChange={setValue} accent={accent} onAccent={onAccent} />
          {errorMsg && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: accent },
              isSubmitting && styles.primaryBtnDisabled,
            ]}
            disabled={isSubmitting}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={onAccent} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: onAccent }]}>SAVE</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
