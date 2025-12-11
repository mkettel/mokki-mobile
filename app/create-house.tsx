import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/lib/context/theme";
import { useHouse } from "@/lib/context/house";
import { createHouse } from "@/lib/api/house";
import { GeometricBackground } from "@/components/GeometricBackground";
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

export default function CreateHouseScreen() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refreshHouses } = useHouse();

  const handleCreateHouse = async () => {
    if (!name.trim()) {
      setError("Please enter a house name");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { house, error: createError } = await createHouse(name);

    if (createError) {
      setError(createError.message);
      setIsLoading(false);
      return;
    }

    // Refresh houses in context
    await refreshHouses();

    setIsLoading(false);

    // Navigate to dashboard
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GeometricBackground />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 60,
              paddingBottom: insets.bottom + 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardContainer}>
            <Card>
              <CardHeader>
                <CardTitle>Create Your House</CardTitle>
                <CardDescription>
                  Give your ski house a name to get started. You can invite
                  members after creating it.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <View style={styles.form}>
                  {/* House Name Field */}
                  <View style={styles.fieldGroup}>
                    <Label>House Name</Label>
                    <Input
                      placeholder="e.g., Powder Palace, Ski Chalet"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      autoFocus
                    />
                  </View>

                  {/* Error Message */}
                  {error && (
                    <Text style={[styles.error, { color: colors.destructive }]}>
                      {error}
                    </Text>
                  )}

                  {/* Submit Button */}
                  <Button
                    onPress={handleCreateHouse}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.submitButton}
                  >
                    {isLoading ? "Creating..." : "Create House"}
                  </Button>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  form: {
    gap: 24,
  },
  fieldGroup: {
    gap: 8,
  },
  error: {
    fontSize: 14,
  },
  submitButton: {
    width: "100%",
    marginTop: 8,
  },
});
