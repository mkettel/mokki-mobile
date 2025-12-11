import { useColors } from "@/lib/context/theme";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface PageContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Duration of fade-in animation in ms (default: 250) */
  duration?: number;
  /** Whether to include background color (default: true) */
  withBackground?: boolean;
}

export function PageContainer({
  children,
  style,
  duration = 250,
  withBackground = true,
}: PageContainerProps) {
  const colors = useColors();
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      // Reset opacity to 0 and animate to 1 every time screen focuses
      opacity.value = 0;
      opacity.value = withTiming(1, { duration });
    }, [duration])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View
      style={[
        styles.container,
        withBackground && { backgroundColor: colors.background },
        style,
      ]}
    >
      <Animated.View style={[styles.content, animatedStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
