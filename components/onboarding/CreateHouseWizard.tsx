import { typography } from "@/constants/theme";
import {
  HOUSE_TEMPLATES,
  type HouseTemplateId,
} from "@/constants/templates";
import { useColors } from "@/lib/context/theme";
import { formatLocalDate } from "@/lib/utils/dates";
import type { BackgroundPattern, FeatureId, HouseSettings } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FeatureToggleGrid } from "./FeatureToggleGrid";
import { HouseDetailsStep } from "./HouseDetailsStep";
import { ReviewStep } from "./ReviewStep";
import { SettingsStep } from "./SettingsStep";
import { TemplateSelector } from "./TemplateSelector";

// Default accent color (matches app default)
const DEFAULT_ACCENT_COLOR = "#4A7C59";

interface CreateHouseWizardProps {
  onComplete: (name: string, settings: Partial<HouseSettings>) => Promise<void>;
  isLoading: boolean;
}

type WizardStep = "template" | "details" | "features" | "settings" | "review";

const STEPS: WizardStep[] = ["template", "details", "features", "settings", "review"];

export function CreateHouseWizard({ onComplete, isLoading }: CreateHouseWizardProps) {
  const colors = useColors();

  // Current step
  const [currentStep, setCurrentStep] = useState<WizardStep>("template");
  const currentStepIndex = STEPS.indexOf(currentStep);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<HouseTemplateId | null>(null);
  const [houseName, setHouseName] = useState("");
  const [tripStartDate, setTripStartDate] = useState<Date | null>(null);
  const [tripEndDate, setTripEndDate] = useState<Date | null>(null);
  const [features, setFeatures] = useState<Record<FeatureId, boolean>>({
    calendar: true,
    weather: true,
    expenses: true,
    bulletin: true,
    chat: true,
    broll: true,
    members: true,
    account: true,
    itinerary: false,
  });
  const [guestNightlyRate, setGuestNightlyRate] = useState(50);
  const [accentColor, setAccentColor] = useState<string | undefined>(DEFAULT_ACCENT_COLOR);
  const [backgroundPattern, setBackgroundPattern] = useState<BackgroundPattern>("mountains");
  const [bedSignupEnabled, setBedSignupEnabled] = useState(false);

  // Apply template defaults when selected
  const handleTemplateSelect = (templateId: HouseTemplateId) => {
    setSelectedTemplate(templateId);
    const template = HOUSE_TEMPLATES[templateId];

    // Apply feature defaults
    setFeatures(template.features);

    // Apply other defaults
    if (template.defaults.guestNightlyRate !== undefined) {
      setGuestNightlyRate(template.defaults.guestNightlyRate);
    }
    if (template.defaults.bedSignupEnabled !== undefined) {
      setBedSignupEnabled(template.defaults.bedSignupEnabled);
    }
  };

  const handleFeatureToggle = (featureId: FeatureId, enabled: boolean) => {
    setFeatures((prev) => ({ ...prev, [featureId]: enabled }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case "template":
        return selectedTemplate !== null;
      case "details":
        return houseName.trim().length > 0;
      case "features":
      case "settings":
      case "review":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep === "review") {
      handleCreate();
    } else {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < STEPS.length) {
        setCurrentStep(STEPS[nextIndex]);
      }
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleCreate = async () => {
    if (!selectedTemplate) return;

    const template = HOUSE_TEMPLATES[selectedTemplate];
    // Enable trip timer if dates are set (for retreat or custom templates)
    const showTripTimer = (template.id === "retreat" || template.id === "custom") && (tripStartDate || tripEndDate);

    // Build settings object
    const settings: Partial<HouseSettings> = {
      // Feature configuration - only set enabled, let defaults handle labels
      features: Object.fromEntries(
        Object.entries(features).map(([key, enabled]) => [
          key,
          { enabled },
        ])
      ) as HouseSettings["features"],

      // Theme
      theme: {
        accentColor,
        backgroundPattern,
      },

      // Guest fees
      guestNightlyRate,

      // Bed signup
      bedSignupEnabled,

      // Trip timer (if retreat template with dates)
      ...(showTripTimer && {
        tripTimer: {
          enabled: true,
          startDate: tripStartDate ? formatLocalDate(tripStartDate) : undefined,
          endDate: tripEndDate ? formatLocalDate(tripEndDate) : undefined,
        },
      }),
    };

    await onComplete(houseName.trim(), settings);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "template":
        return (
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onSelect={handleTemplateSelect}
          />
        );
      case "details":
        return (
          <HouseDetailsStep
            houseName={houseName}
            onHouseNameChange={setHouseName}
            tripStartDate={tripStartDate}
            onTripStartDateChange={setTripStartDate}
            tripEndDate={tripEndDate}
            onTripEndDateChange={setTripEndDate}
            showTripDates={selectedTemplate === "retreat" || selectedTemplate === "custom"}
          />
        );
      case "features":
        return (
          <FeatureToggleGrid features={features} onToggle={handleFeatureToggle} />
        );
      case "settings":
        return (
          <SettingsStep
            guestNightlyRate={guestNightlyRate}
            onGuestNightlyRateChange={setGuestNightlyRate}
            accentColor={accentColor}
            onAccentColorChange={setAccentColor}
            backgroundPattern={backgroundPattern}
            onBackgroundPatternChange={setBackgroundPattern}
            bedSignupEnabled={bedSignupEnabled}
            onBedSignupEnabledChange={setBedSignupEnabled}
          />
        );
      case "review":
        return (
          <ReviewStep
            houseName={houseName}
            templateId={selectedTemplate!}
            features={features}
            guestNightlyRate={guestNightlyRate}
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
            accentColor={accentColor}
          />
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {STEPS.map((step, index) => (
          <View
            key={step}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  index <= currentStepIndex ? colors.primary : colors.muted,
              },
            ]}
          />
        ))}
      </View>

      {/* Step Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        {currentStepIndex > 0 ? (
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.border }]}
            onPress={handleBack}
            disabled={isLoading}
          >
            <FontAwesome name="chevron-left" size={14} color={colors.foreground} />
            <Text style={[styles.backButtonText, { color: colors.foreground }]}>
              Back
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            {
              backgroundColor: canProceed() ? colors.primary : colors.muted,
            },
          ]}
          onPress={handleNext}
          disabled={!canProceed() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Text
                style={[
                  styles.nextButtonText,
                  {
                    color: canProceed()
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                  },
                ]}
              >
                {currentStep === "review" ? "Create House" : "Next"}
              </Text>
              {currentStep !== "review" && (
                <FontAwesome
                  name="chevron-right"
                  size={14}
                  color={
                    canProceed() ? colors.primaryForeground : colors.mutedForeground
                  }
                />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  backButtonPlaceholder: {
    width: 80,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
});
