import { StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";

export default function ExpensesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expenses</Text>
      <Text style={styles.subtitle}>
        Track and split expenses with your crew
      </Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Expense tracking coming in Phase 4
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
