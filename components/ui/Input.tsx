import React, { useState } from "react";
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useColors } from "@/lib/context/theme";
import { borderRadius, shadows, typography } from "@/constants/theme";
import FontAwesome from "@expo/vector-icons/FontAwesome";

// Input Component
interface InputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({ containerStyle, style, ...props }: InputProps) {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor: "transparent",
          borderColor: isFocused ? colors.ring : colors.input,
          color: colors.foreground,
        },
        style,
      ]}
      placeholderTextColor={colors.mutedForeground}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      {...props}
    />
  );
}

// PasswordInput Component
interface PasswordInputProps extends Omit<TextInputProps, "secureTextEntry"> {
  containerStyle?: StyleProp<ViewStyle>;
}

export function PasswordInput({
  containerStyle,
  style,
  ...props
}: PasswordInputProps) {
  const colors = useColors();
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.passwordContainer,
        {
          borderColor: isFocused ? colors.ring : colors.input,
        },
        containerStyle,
      ]}
    >
      <TextInput
        style={[
          styles.passwordInput,
          {
            color: colors.foreground,
          },
          style,
        ]}
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={!isVisible}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      <TouchableOpacity
        onPress={() => setIsVisible(!isVisible)}
        style={styles.eyeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <FontAwesome
          name={isVisible ? "eye" : "eye-slash"}
          size={18}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>
    </View>
  );
}

// Label Component
interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
}

export function Label({ children }: LabelProps) {
  const colors = useColors();

  return (
    <Text style={[styles.label, { color: colors.foreground }]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 36,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    ...shadows.sm,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  eyeButton: {
    paddingHorizontal: 12,
    height: "100%",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 8,
  },
});
