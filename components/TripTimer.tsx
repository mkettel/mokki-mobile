import { typography } from "@/constants/theme";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface TripTimerProps {
  startDate?: string; // ISO date YYYY-MM-DD
  endDate?: string; // ISO date YYYY-MM-DD
  color: string;
}

type TimerState =
  | { type: "hidden" }
  | {
      type: "countdown";
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
    }
  | { type: "dayCounter"; dayNumber: number }
  | { type: "enjoy" };

// Single animated digit with roll effect
function AnimatedDigit({ digit, color }: { digit: string; color: string }) {
  const [displayDigit, setDisplayDigit] = useState(digit);
  const [previousDigit, setPreviousDigit] = useState(digit);
  const isFirstRender = useRef(true);

  const currentY = useSharedValue(0);
  const currentOpacity = useSharedValue(1);
  const previousY = useSharedValue(-20);
  const previousOpacity = useSharedValue(0);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (digit !== displayDigit) {
      setPreviousDigit(displayDigit);

      // Reset positions for animation
      currentY.value = 20;
      currentOpacity.value = 0;
      previousY.value = 0;
      previousOpacity.value = 1;

      setDisplayDigit(digit);

      // Animate
      currentY.value = withTiming(0, { duration: 200 });
      currentOpacity.value = withTiming(1, { duration: 200 });
      previousY.value = withTiming(-20, { duration: 200 });
      previousOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [
    digit,
    displayDigit,
    currentY,
    currentOpacity,
    previousY,
    previousOpacity,
  ]);

  const currentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: currentY.value }],
    opacity: currentOpacity.value,
  }));

  const previousStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: previousY.value }],
    opacity: previousOpacity.value,
    position: "absolute" as const,
  }));

  return (
    <View style={styles.digitContainer}>
      <Animated.Text style={[styles.digit, { color }, previousStyle]}>
        {previousDigit}
      </Animated.Text>
      <Animated.Text style={[styles.digit, { color }, currentStyle]}>
        {displayDigit}
      </Animated.Text>
    </View>
  );
}

// Animated value that splits into individual digits
function AnimatedValue({
  value,
  suffix,
  color,
}: {
  value: number;
  suffix: string;
  color: string;
}) {
  const digits = String(value).split("");

  return (
    <View style={styles.valueContainer}>
      {digits.map((digit, index) => (
        <AnimatedDigit
          key={`${index}-${digits.length}`}
          digit={digit}
          color={color}
        />
      ))}
      {suffix && (
        <Animated.Text style={[styles.suffix, { color }]}>
          {suffix}
        </Animated.Text>
      )}
    </View>
  );
}

function getTimerState(
  now: Date,
  startDate: string | undefined,
  endDate: string | undefined
): TimerState {
  if (!startDate) return { type: "hidden" };

  // Parse dates - use local midnight for start, end of day for end
  const start = new Date(startDate + "T00:00:00");
  const end = endDate ? new Date(endDate + "T23:59:59") : null;

  // After end date - hide
  if (end && now > end) return { type: "hidden" };

  // Before start date - show countdown
  if (now < start) {
    const diff = start.getTime() - now.getTime();
    return {
      type: "countdown",
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  }

  // During trip with end date - show day counter
  if (end) {
    const dayNumber =
      Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { type: "dayCounter", dayNumber };
  }

  // During trip without end date - show enjoy message
  return { type: "enjoy" };
}

export function TripTimer({ startDate, endDate, color }: TripTimerProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!now || !startDate) return null;

  const state = getTimerState(now, startDate, endDate);

  if (state.type === "hidden") return null;

  if (state.type === "countdown") {
    return (
      <Animated.View
        entering={FadeIn.delay(500).duration(400)}
        style={styles.container}
      >
        <AnimatedValue value={state.days} suffix="d" color={color} />
        <AnimatedValue value={state.hours} suffix="h" color={color} />
        <AnimatedValue value={state.minutes} suffix="m" color={color} />
        <AnimatedValue value={state.seconds} suffix="s" color={color} />
      </Animated.View>
    );
  }

  if (state.type === "dayCounter") {
    return (
      <Animated.View
        entering={FadeIn.delay(500).duration(400)}
        style={styles.container}
      >
        <Animated.Text style={[styles.staticText, { color }]}>
          Day{" "}
        </Animated.Text>
        <AnimatedValue value={state.dayNumber} suffix="" color={color} />
        <Animated.Text style={[styles.staticText, { color }]}>
          {" "}
          of your trip
        </Animated.Text>
      </Animated.View>
    );
  }

  // Enjoy message
  return (
    <Animated.Text
      entering={FadeIn.delay(500).duration(400)}
      style={[styles.staticText, { color, marginTop: 12 }]}
    >
      Enjoy your time!
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 2,
  },
  digitContainer: {
    overflow: "hidden",
    height: 22,
    justifyContent: "center",
  },
  digit: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  suffix: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginLeft: 1,
  },
  staticText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
});
