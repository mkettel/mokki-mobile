import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { useColors } from "@/lib/context/theme";
import { borderRadius, shadows, typography } from "@/constants/theme";

// Card Component
interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card + "E6", // 90% opacity for backdrop blur effect
          borderColor: colors.border,
        },
        shadows.DEFAULT,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// CardHeader Component
interface CardHeaderProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return <View style={[styles.cardHeader, style]}>{children}</View>;
}

// CardTitle Component
interface CardTitleProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function CardTitle({ children, style }: CardTitleProps) {
  const colors = useColors();

  return (
    <Text
      style={[
        styles.cardTitle,
        {
          color: colors.cardForeground,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// CardDescription Component
interface CardDescriptionProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function CardDescription({ children, style }: CardDescriptionProps) {
  const colors = useColors();

  return (
    <Text
      style={[
        styles.cardDescription,
        {
          color: colors.mutedForeground,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// CardContent Component
interface CardContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={[styles.cardContent, style]}>{children}</View>;
}

// CardFooter Component
interface CardFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CardFooter({ children, style }: CardFooterProps) {
  return <View style={[styles.cardFooter, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    padding: 24,
    paddingBottom: 0,
    gap: 6,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxSemibold,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 20,
  },
  cardContent: {
    padding: 24,
    paddingTop: 16,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    paddingTop: 0,
  },
});
