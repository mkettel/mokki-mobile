import { StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";

export default function BRollScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>B-Roll</Text>
      <Text style={styles.subtitle}>
        Photos and videos from your ski adventures
      </Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Media gallery coming in Phase 7
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
    marginBottom: 24,
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: "#999",
  },
});
