import { C, F } from "@/lib/theme";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <View style={styles.container}>
      <Image
        source={require("/Users/moose/Developer/Play/skatemeet/assets/images/logo_L.png")}
        style={styles.logo}
      />
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontFamily: F.heading,
    fontSize: 28,
    color: C.text,
    letterSpacing: 2,
  },
  logo: {
    width: 100,
    height: 40,
    resizeMode: "contain",
  },
});

export default Header;
