import {
  TEMPLATE_LIST,
  type HouseTemplate,
  type HouseTemplateId,
} from "@/constants/templates";
import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import Fontisto from "@expo/vector-icons/Fontisto";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface TemplateSelectorProps {
  selectedTemplate: HouseTemplateId | null;
  onSelect: (templateId: HouseTemplateId) => void;
}

export function TemplateSelector({
  selectedTemplate,
  onSelect,
}: TemplateSelectorProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        Choose a template
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Templates pre-configure features for common use cases. You can customize
        everything later.
      </Text>

      <View style={styles.templateList}>
        {TEMPLATE_LIST.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplate === template.id}
            onPress={() => onSelect(template.id)}
          />
        ))}
      </View>
    </View>
  );
}

interface TemplateCardProps {
  template: HouseTemplate;
  isSelected: boolean;
  onPress: () => void;
}

function TemplateCard({ template, isSelected, onPress }: TemplateCardProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isSelected ? colors.primary : colors.muted },
          ]}
        >
          <Fontisto
            name={template.icon as any}
            size={24}
            color={isSelected ? colors.primaryForeground : colors.foreground}
          />
        </View>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
            <Fontisto name="check" size={12} color={colors.primaryForeground} />
          </View>
        )}
      </View>

      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
        {template.name}
      </Text>
      <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
        {template.description}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 24,
    lineHeight: 20,
  },
  templateList: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 20,
  },
});
