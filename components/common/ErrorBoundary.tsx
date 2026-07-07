import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, F } from "@/lib/theme";

type Props = {
  children: React.ReactNode;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={s.container}>
        <Text style={s.title}>SOMETHING WENT WRONG</Text>
        <Text style={s.message}>
          {this.state.error?.message ?? "An unexpected error occurred."}
        </Text>
        <Pressable style={s.button} onPress={this.reset}>
          <Text style={s.buttonText}>RETRY</Text>
        </Pressable>
      </View>
    );
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  title: {
    fontFamily: F.heading,
    fontSize: 22,
    color: C.error,
    textAlign: "center",
  },
  message: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: C.primary,
    borderRadius: 4,
  },
  buttonText: {
    fontFamily: F.heading,
    fontSize: 15,
    color: C.onPrimary,
    letterSpacing: 1,
  },
});
