import { useState, type ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { storyStyles } from "./storyStyles";

type Props = {
  label?: string;
  children: (visible: boolean, close: () => void) => ReactNode;
};

// A Modal draws over everything, Storybook's own navigation included, so a
// sheet story that starts open has no way back (and Storybook reopens the last
// story on launch). Sheet stories start closed behind this button instead, and
// close back to it.
export function ModalTrigger({ label = "OPEN", children }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <TouchableOpacity style={storyStyles.trigger} onPress={() => setVisible(true)} activeOpacity={0.85}>
        <Text style={storyStyles.triggerText}>{label}</Text>
      </TouchableOpacity>
      {children(visible, () => setVisible(false))}
    </View>
  );
}

// Wraps a story callback so it also closes the sheet, e.g.
// onClose={closing(args.onClose, close)}.
export function closing<TArgs extends unknown[], TResult>(
  fn: (...params: TArgs) => TResult,
  close: () => void
) {
  return (...params: TArgs) => {
    close();
    return fn(...params);
  };
}
