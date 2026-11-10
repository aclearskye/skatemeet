import {
  EntityMetadataBase,
  FACILITY_LABELS,
  PARKING_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
} from "@/lib/shared/types";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./EntityMetadataSection.styles";

type Props = {
  metadata: EntityMetadataBase | null;
  isLoading: boolean;
  accent: string;
  canEdit: boolean;
  onEdit: () => void;
};

function todayIndex(): number {
  return (new Date().getDay() + 6) % 7; // JS Sun=0..Sat=6 -> our mon=0..sun=6
}

export function EntityMetadataSection({ metadata, isLoading, accent, canEdit, onEdit }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return <ActivityIndicator color={accent} style={styles.loading} />;
  }

  if (!metadata && !canEdit) return null;

  const today = WEEKDAYS[todayIndex()];
  const todayHours = metadata?.opening_hours?.[today];
  const hasHours = metadata?.opening_hours != null;
  const badges: { label: string; value: boolean | null }[] = metadata
    ? [
        { label: "PET FRIENDLY", value: metadata.pet_friendly },
        { label: "PAID", value: metadata.paid },
        { label: "WELL LIT", value: metadata.well_lit },
      ]
    : [];
  const visibleBadges = badges.filter((b) => b.value != null);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>DETAILS</Text>
        {canEdit && (
          <TouchableOpacity onPress={onEdit} hitSlop={8}>
            <Text style={[styles.editLink, { color: accent }]}>
              {metadata ? "Edit details" : "Add details"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {hasHours && (
        <TouchableOpacity
          style={styles.hoursRow}
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.75}
        >
          <Ionicons name="time-outline" size={15} color={C.muted} />
          <Text style={styles.hoursText}>
            {todayHours?.closed
              ? "Closed today"
              : todayHours?.open && todayHours?.close
                ? `Open today ${todayHours.open}–${todayHours.close}`
                : "Open today"}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={C.muted}
          />
        </TouchableOpacity>
      )}

      {expanded && hasHours && (
        <View style={styles.weekList}>
          {WEEKDAYS.map((day) => {
            const hours = metadata!.opening_hours![day];
            return (
              <View key={day} style={styles.weekRow}>
                <Text style={styles.weekDay}>{WEEKDAY_LABELS[day]}</Text>
                <Text style={styles.weekHours}>
                  {hours.closed ? "Closed" : `${hours.open ?? "?"}–${hours.close ?? "?"}`}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {metadata && metadata.facilities.length > 0 && (
        <View style={styles.chipRow}>
          {metadata.facilities.map((facility) => (
            <DuctTapeLabel
              key={facility}
              color={C.primary}
              style={styles.facilityChip}
              accessibilityLabel={`Facility: ${FACILITY_LABELS[facility]}`}
            >
              <Text style={styles.facilityChipText}>{FACILITY_LABELS[facility]}</Text>
            </DuctTapeLabel>
          ))}
        </View>
      )}

      {metadata?.parking && (
        <DuctTapeLabel
          color={C.tertiary}
          style={styles.parkingChip}
          accessibilityLabel={`Parking: ${PARKING_LABELS[metadata.parking]}`}
        >
          <Ionicons name="car-outline" size={15} color={C.onTertiary} />
          <Text style={styles.parkingChipText}>{PARKING_LABELS[metadata.parking]}</Text>
        </DuctTapeLabel>
      )}

      {visibleBadges.length > 0 && (
        <View style={styles.chipRow}>
          {visibleBadges.map((badge) =>
            badge.value ? (
              <DuctTapeLabel
                key={badge.label}
                color={C.secondary}
                style={styles.badgeOn}
                accessibilityLabel={`${badge.label}: yes`}
              >
                <Ionicons name="checkmark" size={12} color={C.onSecondary} />
                <Text style={styles.badgeOnText}>{badge.label}</Text>
              </DuctTapeLabel>
            ) : (
              <View
                key={badge.label}
                style={styles.badgeOff}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${badge.label}: no`}
              >
                <Ionicons name="close" size={12} color={C.muted} />
                <Text style={styles.chipText}>{badge.label}</Text>
              </View>
            )
          )}
        </View>
      )}

      {!metadata && canEdit && (
        <Text style={styles.emptyText}>No details yet — add opening hours, facilities and more.</Text>
      )}
    </View>
  );
}
