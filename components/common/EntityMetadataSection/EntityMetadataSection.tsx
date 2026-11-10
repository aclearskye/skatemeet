import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  EntityMetadataBase,
  FACILITY_LABELS,
  PARKING_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
} from "@/lib/shared/types";
import { C } from "@/lib/theme";
import { TapeChip } from "@/components/common/TapeChip";
import { styles } from "./EntityMetadataSection.styles";

type Props = {
  metadata: EntityMetadataBase | null;
  isLoading: boolean;
  accent: string;
  canEdit: boolean;
  onEdit: () => void;
};

const FACILITY_COLORS = { bg: C.primary, fg: C.onPrimary };
const PARKING_COLORS = { bg: C.tertiary, fg: C.onTertiary };
const BADGE_COLORS = { bg: C.secondary, fg: C.onSecondary };

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
  // Unknown (null) shows nothing. Yes and no both get the orange tape, each
  // with its own wording, so the row never needs a tick or cross icon.
  const badges: { yes: string; no: string; value: boolean | null }[] = metadata
    ? [
        { yes: "Pet friendly", no: "No pets", value: metadata.pet_friendly },
        { yes: "Paid", no: "Free", value: metadata.paid },
        { yes: "Well lit", no: "Not lit", value: metadata.well_lit },
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

      {metadata && (metadata.facilities.length > 0 || metadata.parking || visibleBadges.length > 0) && (
        <View style={styles.chipRow}>
          {metadata.facilities.map((facility) => (
            <TapeChip
              key={facility}
              text={FACILITY_LABELS[facility]}
              colors={FACILITY_COLORS}
              accessibilityLabel={`Facility: ${FACILITY_LABELS[facility]}`}
            />
          ))}
          {metadata.parking && (
            <TapeChip
              text={PARKING_LABELS[metadata.parking]}
              colors={PARKING_COLORS}
              accessibilityLabel={`Parking: ${PARKING_LABELS[metadata.parking]}`}
            />
          )}
          {visibleBadges.map((badge) => (
            <TapeChip
              key={badge.yes}
              text={badge.value ? badge.yes : badge.no}
              colors={BADGE_COLORS}
              accessibilityLabel={`${badge.yes}: ${badge.value ? "yes" : "no"}`}
            />
          ))}
        </View>
      )}

      {!metadata && canEdit && (
        <Text style={styles.emptyText}>No details yet — add opening hours, facilities and more.</Text>
      )}
    </View>
  );
}
