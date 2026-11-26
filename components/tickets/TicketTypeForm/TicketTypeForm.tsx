import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSaveTicketType } from "@/lib/tickets/hooks/useSaveTicketType";
import { TicketsError, WEEKDAYS, type OwnTicketType, type TicketKind } from "@/lib/tickets/types";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { StoreTextField } from "@/components/storeAccount/StoreTextField";
import { styles } from "./TicketTypeForm.styles";

type Props = {
  // Null: a new ticket.
  ticketType: OwnTicketType | null;
  onDone: () => void;
};

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PRICE_REGEX = /^\d+(\.\d{1,2})?$/;

const KIND_LABEL: Record<TicketKind, string> = { session: "SESSION", pass: "PASS" };

type PassMode = "dates" | "rolling";
const PASS_MODES: { mode: PassMode; label: string }[] = [
  { mode: "dates", label: "SET DATES" },
  { mode: "rolling", label: "DAYS FROM PURCHASE" },
];
const KIND_HINT: Record<TicketKind, string> = {
  session:
    "One entry on a day of the week, e.g. \"Free Skate 2–9pm\" on Saturday. If it isn't used, it's good for a later session on the same day.",
  pass: "Entry once a day for a stretch of time: between two set dates, or for a number of days from when it's bought.",
};

function isRealDate(value: string): boolean {
  return DATE_REGEX.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

// Creates or edits a ticket type. Tickets already sold keep the details
// they were bought with.
export function TicketTypeForm({ ticketType, onDone }: Props) {
  const save = useSaveTicketType();
  const [kind, setKind] = useState<TicketKind>(ticketType?.kind ?? "session");
  const [name, setName] = useState(ticketType?.name ?? "");
  const [description, setDescription] = useState(ticketType?.description ?? "");
  const [price, setPrice] = useState(ticketType ? (ticketType.priceMinor / 100).toFixed(2) : "");
  const [weekday, setWeekday] = useState<number>(ticketType?.weekday ?? 6);
  const [startTime, setStartTime] = useState(ticketType?.startTime ?? "");
  const [endTime, setEndTime] = useState(ticketType?.endTime ?? "");
  const [validFrom, setValidFrom] = useState(ticketType?.validFrom ?? "");
  const [validTo, setValidTo] = useState(ticketType?.validTo ?? "");
  // A pass runs between set dates, or for a number of days from purchase.
  const [passMode, setPassMode] = useState<PassMode>(ticketType?.passDays ? "rolling" : "dates");
  const [passDays, setPassDays] = useState(ticketType?.passDays ? String(ticketType.passDays) : "30");
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (name.trim().length < 2) return "Give the ticket a name.";
    if (!PRICE_REGEX.test(price.trim()) || Number(price) < 0.3) return "Enter a price of at least 0.30, e.g. 6.00.";
    if (kind === "session") {
      const start = startTime.trim();
      const end = endTime.trim();
      if (start || end) {
        if (!TIME_REGEX.test(start) || !TIME_REGEX.test(end)) return "Enter times as HH:MM, e.g. 14:00, or leave both empty.";
        if (end <= start) return "The session has to end after it starts.";
      }
    } else if (passMode === "rolling") {
      const days = Number(passDays.trim());
      if (!/^\d+$/.test(passDays.trim()) || days < 1 || days > 366) return "Enter a number of days from 1 to 366.";
    } else {
      if (!isRealDate(validFrom.trim()) || !isRealDate(validTo.trim())) return "Enter dates as YYYY-MM-DD.";
      if (validTo.trim() < validFrom.trim()) return "The last day has to be on or after the first day.";
    }
    return null;
  };

  const handleSave = () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const isSession = kind === "session";
    const rolling = !isSession && passMode === "rolling";
    save.mutate(
      {
        ticketTypeId: ticketType?.ticketTypeId ?? null,
        kind,
        name: name.trim(),
        description: description.trim(),
        priceMinor: Math.round(Number(price) * 100),
        weekday: isSession ? weekday : null,
        startTime: isSession && startTime.trim() ? startTime.trim() : null,
        endTime: isSession && endTime.trim() ? endTime.trim() : null,
        validFrom: isSession || rolling ? null : validFrom.trim(),
        validTo: isSession || rolling ? null : validTo.trim(),
        passDays: rolling ? Number(passDays.trim()) : null,
      },
      {
        onSuccess: onDone,
        onError: (err) => setError(err instanceof TicketsError ? err.message : "Couldn't save. Try again."),
      }
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{ticketType ? "EDIT TICKET" : "NEW TICKET"}</Text>
      <View style={styles.tabs}>
        {(["session", "pass"] as const).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.tab, kind === option && styles.tabSelected]}
            onPress={() => setKind(option)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, kind === option && styles.tabTextSelected]}>{KIND_LABEL[option]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.hint}>{KIND_HINT[kind]}</Text>

      <StoreTextField
        label="NAME"
        hint={kind === "session" ? 'e.g. "Free Skate 2–9pm"' : 'e.g. "Monthly Skate Pass"'}
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <StoreTextField
        label="DETAILS"
        hint="Optional. What's included, who it's for."
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={500}
      />
      <StoreTextField label="PRICE" hint="e.g. 6.00" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />

      {kind === "session" ? (
        <>
          <Text style={styles.label}>DAY</Text>
          <View style={styles.days}>
            {WEEKDAYS.map((day, index) => (
              <TouchableOpacity
                key={day}
                style={[styles.day, weekday === index && styles.tabSelected]}
                onPress={() => setWeekday(index)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, weekday === index && styles.tabTextSelected]}>
                  {day.slice(0, 3).toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.pair}>
            <View style={styles.pairItem}>
              <StoreTextField label="STARTS" hint="HH:MM, optional" value={startTime} onChangeText={setStartTime} maxLength={5} />
            </View>
            <View style={styles.pairItem}>
              <StoreTextField label="ENDS" hint="HH:MM, optional" value={endTime} onChangeText={setEndTime} maxLength={5} />
            </View>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.label}>VALID</Text>
          <View style={styles.tabs}>
            {PASS_MODES.map(({ mode, label }) => (
              <TouchableOpacity
                key={mode}
                style={[styles.tab, passMode === mode && styles.tabSelected]}
                onPress={() => setPassMode(mode)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, passMode === mode && styles.tabTextSelected]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {passMode === "rolling" ? (
            <StoreTextField
              label="DAYS"
              hint="Counted from the day it's bought (day 1), so a 30-day pass covers 30 days in a row."
              value={passDays}
              onChangeText={setPassDays}
              keyboardType="number-pad"
              maxLength={3}
            />
          ) : (
            <View style={styles.pair}>
              <View style={styles.pairItem}>
                <StoreTextField label="FIRST DAY" hint="YYYY-MM-DD" value={validFrom} onChangeText={setValidFrom} maxLength={10} />
              </View>
              <View style={styles.pairItem}>
                <StoreTextField label="LAST DAY" hint="YYYY-MM-DD" value={validTo} onChangeText={setValidTo} maxLength={10} />
              </View>
            </View>
          )}
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <StorePrimaryButton label={ticketType ? "SAVE TICKET" : "ADD TICKET"} onPress={handleSave} isBusy={save.isPending} />
      <StorePrimaryButton label="CANCEL" variant="secondary" onPress={onDone} />
    </View>
  );
}
