import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { useColors } from "@/lib/context/theme";
import { borderRadius, shadows, typography } from "@/constants/theme";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  children,
  onPress,
  variant = "default",
  size = "default",
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const colors = useColors();

  const getVariantStyles = (): {
    container: ViewStyle;
    text: TextStyle;
  } => {
    switch (variant) {
      case "default":
        return {
          container: {
            backgroundColor: colors.primary,
            ...shadows.sm,
          },
          text: {
            color: colors.primaryForeground,
          },
        };
      case "destructive":
        return {
          container: {
            backgroundColor: colors.destructive,
            ...shadows.sm,
          },
          text: {
            color: colors.destructiveForeground,
          },
        };
      case "outline":
        return {
          container: {
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.input,
            ...shadows.sm,
          },
          text: {
            color: colors.foreground,
          },
        };
      case "secondary":
        return {
          container: {
            backgroundColor: colors.secondary,
            ...shadows.sm,
          },
          text: {
            color: colors.secondaryForeground,
          },
        };
      case "ghost":
        return {
          container: {
            backgroundColor: "transparent",
          },
          text: {
            color: colors.foreground,
          },
        };
      case "link":
        return {
          container: {
            backgroundColor: "transparent",
          },
          text: {
            color: colors.primary,
            textDecorationLine: "underline",
          },
        };
      default:
        return {
          container: {
            backgroundColor: colors.primary,
          },
          text: {
            color: colors.primaryForeground,
          },
        };
    }
  };

  const getSizeStyles = (): {
    container: ViewStyle;
    text: TextStyle;
  } => {
    switch (size) {
      case "sm":
        return {
          container: {
            height: 32,
            paddingHorizontal: 12,
            borderRadius: borderRadius.lg,
          },
          text: {
            fontSize: 12,
          },
        };
      case "lg":
        return {
          container: {
            height: 44,
            paddingHorizontal: 32,
            borderRadius: borderRadius.lg,
          },
          text: {
            fontSize: 16,
          },
        };
      case "icon":
        return {
          container: {
            height: 36,
            width: 36,
            paddingHorizontal: 0,
            borderRadius: borderRadius.lg,
          },
          text: {
            fontSize: 14,
          },
        };
      default:
        return {
          container: {
            height: 36,
            paddingHorizontal: 16,
            borderRadius: borderRadius.lg,
          },
          text: {
            fontSize: 14,
          },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        variantStyles.container,
        sizeStyles.container,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variantStyles.text.color}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            variantStyles.text,
            sizeStyles.text,
            textStyle,
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: typography.fontFamily.chillaxMedium,
    textAlign: "center",
  },
});
