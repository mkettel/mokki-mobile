import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { useColors } from "@/lib/context/theme";

export function GeometricBackground() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();

  // Don't render until we have valid dimensions
  if (width === 0 || height === 0) {
    return null;
  }

  // Mountain takes up bottom 65% of screen
  const mountainHeight = height * 0.65;

  // The mountain shape points - creates a mountain silhouette
  const points = [
    [0, mountainHeight],                          // bottom-left
    [0, mountainHeight * 0.5],                    // left edge, 50% up
    [width * 0.20, mountainHeight * 0.35],        // first slope
    [width * 0.38, 0],                            // highest peak
    [width * 0.55, mountainHeight * 0.25],        // valley
    [width * 0.70, mountainHeight * 0.15],        // second peak
    [width * 0.85, mountainHeight * 0.30],        // slope down
    [width, mountainHeight * 0.40],               // right edge
    [width, mountainHeight],                      // bottom-right
  ].map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={width} height={height}>
        <Polygon
          points={points}
          fill={colors.geometricBlue}
          translateY={height - mountainHeight}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});
