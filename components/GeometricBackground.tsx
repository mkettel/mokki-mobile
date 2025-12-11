import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Polygon, Defs, Pattern, Rect, G } from "react-native-svg";
import { lightColors } from "@/constants/theme";

const { width, height } = Dimensions.get("window");

export function GeometricBackground() {
  // The mountain shape points - matching the web CSS clip-path
  // polygon(0% 100%, 0% 50%, 20% 35%, 38% 0%, 55% 25%, 70% 15%, 85% 30%, 100% 40%, 100% 100%)
  // Convert percentages to actual coordinates
  const mountainHeight = height * 0.65; // 65vh equivalent

  const points = [
    `0,${mountainHeight}`,           // 0% 100%
    `0,${mountainHeight * 0.5}`,     // 0% 50%
    `${width * 0.20},${mountainHeight * 0.35}`, // 20% 35%
    `${width * 0.38},0`,             // 38% 0%
    `${width * 0.55},${mountainHeight * 0.25}`, // 55% 25%
    `${width * 0.70},${mountainHeight * 0.15}`, // 70% 15%
    `${width * 0.85},${mountainHeight * 0.30}`, // 85% 30%
    `${width},${mountainHeight * 0.40}`,        // 100% 40%
    `${width},${mountainHeight}`,    // 100% 100%
  ].join(" ");

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.svgContainer}>
        <Svg
          width={width}
          height={mountainHeight}
          viewBox={`0 0 ${width} ${mountainHeight}`}
          style={styles.svg}
        >
          {/* Main mountain shape */}
          <Polygon
            points={points}
            fill={lightColors.geometricBlue}
          />
        </Svg>
        {/* Noise overlay - using semi-transparent view for subtle texture effect */}
        <View style={styles.noiseOverlay} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: -1,
  },
  svgContainer: {
    position: "relative",
  },
  svg: {
    position: "absolute",
    bottom: 0,
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
});
