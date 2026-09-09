import { OpeningHours, WEEKDAYS, WEEKDAY_LABELS, Weekday } from "@/lib/shared/types";
import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./OpeningHoursInput.styles";

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hours = String(Math.floor(i / 2)).padStart(2, "0");
  const minutes = i % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

type OpenField = { day: Weekday; field: "open" | "close" } | null;

type TimeButtonProps = { label: string; disabled?: boolean; onPress: () => void };

// File-local: only used by the two time slots in each of the 7 rows below.
function TimeButton({ label, disabled, onPress }: TimeButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.timeBtn, disabled && styles.timeBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <Text style={styles.timeBtnText}>{label}</Text>
      <Ionicons name="chevron-down" size={12} color={C.muted} />
    </TouchableOpacity>
  );
}

type Props = {
  value: OpeningHours;
  onChange: (value: OpeningHours) => void;
};

export function OpeningHoursInput({ value, onChange }: Props) {
  const [openField, setOpenField] = useState<OpenField>(null);

  function updateDay(day: Weekday, patch: Partial<OpeningHours[Weekday]>) {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  }

  function selectTime(time: string) {
    if (!openField) return;
    updateDay(openField.day, { [openField.field]: time });
    setOpenField(null);
  }

  return (
    <View style={styles.container}>
      {WEEKDAYS.map((day) => {
        const hours = value[day];
        return (
          <View key={day} style={styles.row}>
            <Text style={styles.dayLabel}>{WEEKDAY_LABELS[day].slice(0, 3).toUpperCase()}</Text>

            <View style={styles.timeRow}>
              <TimeButton
                label={hours.closed ? "—" : (hours.open ?? "OPEN")}
                disabled={hours.closed}
                onPress={() => setOpenField({ day, field: "open" })}
              />
              <Text style={styles.timeSep}>–</Text>
              <TimeButton
                label={hours.closed ? "—" : (hours.close ?? "CLOSE")}
                disabled={hours.closed}
                onPress={() => setOpenField({ day, field: "close" })}
              />
            </View>

            <View style={styles.closedToggle}>
              <Text style={styles.closedLabel}>CLOSED</Text>
              <Switch
                value={hours.closed}
                onValueChange={(closed) => updateDay(day, { closed })}
                trackColor={{ true: C.muted, false: C.border }}
              />
            </View>
          </View>
        );
      })}

      <Modal
        visible={openField != null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenField(null)}
      >
        <View style={styles.pickerOverlay}>
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setOpenField(null)}
          />
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>SELECT TIME</Text>
            <ScrollView style={styles.pickerList}>
              {TIME_SLOTS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={styles.pickerRow}
                  onPress={() => selectTime(time)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerRowText}>{time}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
