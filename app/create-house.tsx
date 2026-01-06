import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Platform,
  Alert,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/lib/context/theme";
import { useHouse } from "@/lib/context/house";
import { createHouse, updateHouseSettings } from "@/lib/api/house";
import { joinHouseWithCode } from "@/lib/api/members";
import { GeometricBackground } from "@/components/GeometricBackground";
import { CreateHouseWizard } from "@/components/onboarding";
import { typography } from "@/constants/theme";
import type { HouseSettings } from "@/types/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
} from "@/components/ui";

type Tab = "join" | "create";

export default function CreateHouseScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("join");
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refreshHouses } = useHouse();

  const handleJoinWithCode = async () => {
    const code = inviteCode.trim().toUpperCase();

    if (!code) {
      setJoinError("Please enter an invite code");
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const { success, houseName, error: joinErr } = await joinHouseWithCode(code);

      if (joinErr) {
        setJoinError(joinErr.message);
        setIsJoining(false);
        return;
      }

      if (success) {
        await refreshHouses();
        setIsJoining(false);

        const message = houseName
          ? `You've joined "${houseName}"!`
          : "You've joined the house!";

        if (Platform.OS === "web") {
          window.alert(message);
        } else {
          Alert.alert("Welcome!", message);
        }

        router.replace("/(tabs)");
      }
    } catch (error) {
      console.error("Error joining house:", error);
      setJoinError("Failed to join house. Please try again.");
      setIsJoining(false);
    }
  };

  const handleCreateHouse = async (name: string, settings: Partial<HouseSettings>) => {
    setIsCreating(true);

    try {
      // Create the house
      const { house, error: createError } = await createHouse(name);

      if (createError || !house) {
        const message = createError?.message || "Failed to create house";
        if (Platform.OS === "web") {
          window.alert(message);
        } else {
          Alert.alert("Error", message);
        }
        setIsCreating(false);
        return;
      }

      // Apply settings if provided
      let settingsApplied = true;
      if (Object.keys(settings).length > 0) {
        const { error: settingsError } = await updateHouseSettings(house.id, settings);
        if (settingsError) {
          console.error("Error applying house settings:", settingsError);
          settingsApplied = false;
        }
      }

      await refreshHouses();
      setIsCreating(false);

      // Warn user if settings failed to apply
      if (!settingsApplied) {
        const warningMessage = "House created, but some settings couldn't be applied. You can update them in House Settings.";
        if (Platform.OS === "web") {
          window.alert(warningMessage);
        } else {
          Alert.alert("Partial Success", warningMessage);
        }
      }

      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error creating house:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
      setIsCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GeometricBackground />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <View
            style={[
              styles.tabBar,
              { backgroundColor: colors.muted },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "join" && {
                  backgroundColor: colors.card,
                },
              ]}
              onPress={() => setActiveTab("join")}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "join"
                        ? colors.foreground
                        : colors.mutedForeground,
                  },
                ]}
              >
                Join House
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "create" && {
                  backgroundColor: colors.card,
                },
              ]}
              onPress={() => setActiveTab("create")}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "create"
                        ? colors.foreground
                        : colors.mutedForeground,
                  },
                ]}
              >
                Create House
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Content */}
        {activeTab === "join" ? (
          <View style={styles.joinContainer}>
            <Card style={styles.joinCard}>
              <CardHeader>
                <CardTitle>Join a House</CardTitle>
                <CardDescription>
                  Have an invite code? Enter it below to join an existing house.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <View style={styles.form}>
                  <View style={styles.fieldGroup}>
                    <Label>Invite Code</Label>
                    <Input
                      placeholder="e.g., ABC123XY"
                      value={inviteCode}
                      onChangeText={(text) => {
                        setInviteCode(text.toUpperCase());
                        setJoinError(null);
                      }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={8}
                      style={styles.codeInput}
                    />
                  </View>

                  {joinError && (
                    <Text style={[styles.error, { color: colors.destructive }]}>
                      {joinError}
                    </Text>
                  )}

                  <Button
                    onPress={handleJoinWithCode}
                    loading={isJoining}
                    disabled={isJoining || !inviteCode.trim()}
                    style={styles.submitButton}
                  >
                    {isJoining ? "Joining..." : "Join House"}
                  </Button>
                </View>
              </CardContent>
            </Card>
          </View>
        ) : (
          <View style={styles.wizardContainer}>
            <CreateHouseWizard
              onComplete={handleCreateHouse}
              isLoading={isCreating}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    width: "100%",
    maxWidth: 400,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  joinContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  joinCard: {
    width: "100%",
    maxWidth: 400,
  },
  wizardContainer: {
    flex: 1,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  codeInput: {
    letterSpacing: 4,
    fontFamily: typography.fontFamily.chillaxSemibold,
    textAlign: "center",
    fontSize: 18,
  },
  error: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  submitButton: {
    width: "100%",
    marginTop: 4,
  },
});
