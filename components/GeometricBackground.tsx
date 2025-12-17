import { useColors } from "@/lib/context/theme";
import React from "react";
import {
  Image,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, {
  ClipPath,
  Defs,
  Polygon,
  Image as SvgImage,
} from "react-native-svg";

// Import the noise texture
const noiseTexture = require("@/assets/images/noise-texture.png");

// Get the URI for the noise texture (platform-specific)
function getNoiseUri(): string {
  if (Platform.OS === "web") {
    // On web, the require returns the URI directly
    return noiseTexture;
  }
  // On native, we need to resolve the asset source
  const resolved = Image.resolveAssetSource(noiseTexture);
  return resolved?.uri || "";
}

export function GeometricBackground() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();

  if (width === 0 || height === 0) {
    return null;
  }

  // Mountain takes up bottom 65% of screen
  const mountainHeight = height * 0.65;
  const mountainTop = height - mountainHeight;

  // The mountain shape points - creates a mountain silhouette
  const points = [
    [0, mountainHeight], // bottom-left
    [0, mountainHeight * 0.5], // left edge, 50% up
    [width * 0.14, mountainHeight * 0.35], // first slope
    [width * 0.38, 0], // highest peak
    [width * 0.55, mountainHeight * 0.25], // valley
    [width * 0.7, mountainHeight * 0.15], // second peak
    [width * 0.85, mountainHeight * 0.3], // slope down
    [width, mountainHeight * 0.4], // right edge
    [width, mountainHeight], // bottom-right
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <ClipPath id="mountainClip">
            <Polygon points={points} translateY={mountainTop} />
          </ClipPath>
        </Defs>

        {/* Base mountain shape */}
        <Polygon
          points={points}
          fill={colors.geometricBlue}
          translateY={mountainTop}
        />

        {/* Noise texture overlay - clipped to mountain shape */}
        <SvgImage
          href={getNoiseUri()}
          x={0}
          y={mountainTop}
          width={width}
          height={mountainHeight}
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#mountainClip)"
          opacity={0.25}
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
