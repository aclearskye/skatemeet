import { PHOTO_REPORT_REASONS, PhotoReportReason } from "@/lib/shared/types";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./ReportReasonSheet.styles";

type Props = {
  onSelect: (reason: PhotoReportReason) => void;
  onCancel: () => void;
};

export function ReportReasonSheet({ onSelect, onCancel }: Props) {
  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel} />
      <View style={styles.sheet}>
        <Text style={styles.title}>WHY ARE YOU REPORTING THIS PHOTO?</Text>
        {PHOTO_REPORT_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason.code}
            style={styles.row}
            onPress={() => onSelect(reason.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowText}>{reason.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelText}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
