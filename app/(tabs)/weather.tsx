import { PageContainer } from "@/components/PageContainer";
import { TopBar } from "@/components/TopBar";
import {
  CurrentConditionsCard,
  HourlyForecast,
  ResortPickerModal,
  ResortWeatherCard,
  SnowForecast,
} from "@/components/weather";
import { typography } from "@/constants/theme";
import { updateHouseFavoriteResorts } from "@/lib/api/house";
import {
  clearWeatherCache,
  getMultipleWeatherReports,
} from "@/lib/api/weather";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import type { WeatherReport } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function WeatherScreen() {
  const colors = useColors();
  const { activeHouse, refreshHouses } = useHouse();

  // Data state
  const [reports, setReports] = useState<WeatherReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedReportIndex, setSelectedReportIndex] = useState(0);
  const [showResortPicker, setShowResortPicker] = useState(false);

  // Fetch weather data
  const fetchWeather = useCallback(
    async (forceRefresh = false) => {
      if (!activeHouse) return;

      const resortIds = activeHouse.favorite_resort_ids || [];
      if (activeHouse.resort_id && !resortIds.includes(activeHouse.resort_id)) {
        resortIds.unshift(activeHouse.resort_id);
      }

      if (resortIds.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        if (forceRefresh) {
          await clearWeatherCache();
        }

        const { reports: weatherReports, error } =
          await getMultipleWeatherReports(resortIds);

        if (error) {
          console.error("Error fetching weather:", error);
        } else {
          setReports(weatherReports);
          // Reset selection if current selection is out of bounds
          if (selectedReportIndex >= weatherReports.length) {
            setSelectedReportIndex(0);
          }
        }
      } catch (error) {
        console.error("Error fetching weather data:", error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeHouse, selectedReportIndex]
  );

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWeather(true);
  };

  const handleSaveResorts = async (resortIds: string[]) => {
    if (!activeHouse) return;

    const { error } = await updateHouseFavoriteResorts(
      activeHouse.id,
      resortIds
    );
    if (error) {
      throw error;
    }

    // Refresh house data and weather
    await refreshHouses();
    setIsLoading(true);
    await fetchWeather(true);
  };

  const selectedReport = reports[selectedReportIndex];
  const currentResortIds = activeHouse?.favorite_resort_ids || [];

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <TopBar />
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  // No resorts configured
  if (reports.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar />
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Pow report
          </Text>
          <TouchableOpacity
            style={[styles.manageButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowResortPicker(true)}
          >
            <FontAwesome
              name="plus"
              size={14}
              color={colors.primaryForeground}
            />
            <Text
              style={[
                styles.manageButtonText,
                { color: colors.primaryForeground },
              ]}
            >
              Add Resorts
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <FontAwesome
            name="snowflake-o"
            size={48}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No resorts configured
          </Text>
          <Text
            style={[styles.emptySubtext, { color: colors.mutedForeground }]}
          >
            Add resorts to see weather and snow reports.
          </Text>
          <TouchableOpacity
            style={[
              styles.addResortsButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => setShowResortPicker(true)}
          >
            <FontAwesome
              name="plus"
              size={14}
              color={colors.primaryForeground}
            />
            <Text
              style={[
                styles.addResortsButtonText,
                { color: colors.primaryForeground },
              ]}
            >
              Add Resorts
            </Text>
          </TouchableOpacity>
        </View>

        <ResortPickerModal
          visible={showResortPicker}
          selectedResortIds={currentResortIds}
          onClose={() => setShowResortPicker(false)}
          onSave={handleSaveResorts}
        />
      </View>
    );
  }

  return (
    <PageContainer>
      <TopBar />

      {/* Header with action buttons */}
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Pow report
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.manageButton, { backgroundColor: colors.muted }]}
            onPress={() => setShowResortPicker(true)}
          >
            <FontAwesome name="cog" size={14} color={colors.foreground} />
            <Text
              style={[styles.manageButtonText, { color: colors.foreground }]}
            >
              Resorts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.muted }]}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <FontAwesome name="refresh" size={16} color={colors.foreground} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.foreground}
          />
        }
      >
        {/* Resort selector (if multiple resorts) */}
        {reports.length > 1 && (
          <View style={styles.resortSelector}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Resorts
            </Text>
            {reports.map((report, index) => (
              <ResortWeatherCard
                key={report.resort.id}
                report={report}
                isSelected={index === selectedReportIndex}
                onPress={() => setSelectedReportIndex(index)}
              />
            ))}
          </View>
        )}

        {/* Selected resort details */}
        {selectedReport && (
          <View style={styles.detailsSection}>
            {reports.length === 1 && (
              <ResortWeatherCard report={selectedReport} isSelected={true} />
            )}

            {/* Current conditions */}
            <View style={styles.cardWrapper}>
              <CurrentConditionsCard
                current={selectedReport.weather.current}
                daily={selectedReport.weather.daily}
                resort={selectedReport.resort}
              />
            </View>

            {/* Hourly forecast */}
            <View style={styles.cardWrapper}>
              <HourlyForecast hourly={selectedReport.weather.hourly} />
            </View>

            {/* Snow forecast */}
            <View style={styles.cardWrapper}>
              <SnowForecast daily={selectedReport.weather.daily} />
            </View>

            {/* Last updated */}
            <View style={styles.lastUpdated}>
              <Text
                style={[
                  styles.lastUpdatedText,
                  { color: colors.mutedForeground },
                ]}
              >
                Data cached for 30 minutes • Pull to refresh
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <ResortPickerModal
        visible={showResortPicker}
        selectedResortIds={currentResortIds}
        onClose={() => setShowResortPicker(false)}
        onSave={handleSaveResorts}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
    maxWidth: "50%",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  manageButtonText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addResortsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  addResortsButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resortSelector: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 12,
  },
  detailsSection: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  cardWrapper: {
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
  lastUpdated: {
    alignItems: "center",
    paddingVertical: 16,
  },
  lastUpdatedText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
});
