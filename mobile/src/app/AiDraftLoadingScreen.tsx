import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

const GREEN = '#008236';

type StepStatus = 'pending' | 'active' | 'done';

interface Step {
  label: string;
  duration: number; // ms this step takes before completing
}

const STEPS: Step[] = [
  { label: 'Processing grain image',   duration: 1800 },
  { label: 'Analyzing spread pattern', duration: 2200 },
  { label: 'Computing ASV score',      duration: 1600 },
];

// ─── Spinning arc indicator ────────────────────────────────────────────────────
function SpinnerArc({ color, size = 22 }: { color: string; size?: number }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2.5,
        borderColor: 'transparent',
        borderTopColor: color,
        borderRightColor: color,
        transform: [{ rotate: spin }],
      }}
    />
  );
}

// ─── Step row ─────────────────────────────────────────────────────────────────
function StepRow({
  label,
  status,
  color,
}: {
  label: string;
  status: StepStatus;
  color: string;
}) {
  // Progress bar animation
  const barWidth = useRef(new Animated.Value(0)).current;
  // Fade-in for the whole row
  const opacity  = useRef(new Animated.Value(status === 'pending' ? 0.38 : 1)).current;

  useEffect(() => {
    if (status === 'active') {
      // Fade row in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      // Animate bar to ~70% (partial — still in progress)
      Animated.timing(barWidth, {
        toValue: 0.72,
        duration: 1600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else if (status === 'done') {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(barWidth, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // pending — keep dim
      Animated.timing(opacity, { toValue: 0.38, duration: 200, useNativeDriver: true }).start();
      barWidth.setValue(0);
    }
  }, [status]);

  const widthInterpolated = barWidth.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Dot indicator
  const renderDot = () => {
    if (status === 'done') {
      return (
        <View style={[styles.dotCircle, { backgroundColor: GREEN, borderColor: GREEN }]}>
          <Text style={styles.dotCheck}>✓</Text>
        </View>
      );
    }
    if (status === 'active') {
      return <SpinnerArc color={color} size={22} />;
    }
    // pending
    return (
      <View style={[styles.dotCircle, { backgroundColor: 'transparent', borderColor: '#D1D5DB' }]} />
    );
  };

  return (
    <Animated.View style={[styles.stepRow, { opacity }]}>
      <View style={styles.stepDotWrapper}>{renderDot()}</View>

      <View style={styles.stepBody}>
        <Text style={[styles.stepLabel, status === 'pending' && styles.stepLabelDim]}>
          {label}
        </Text>

        {/* Progress track — only show when active or done */}
        {status !== 'pending' && (
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: widthInterpolated, backgroundColor: color },
              ]}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Top spinner (large arc in header area) ────────────────────────────────────
function HeaderSpinner() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.headerSpinner, { transform: [{ rotate: spin }] }]} />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AiDraftLoadingScreen({ navigation, route }: any) {
  const [statuses, setStatuses] = useState<StepStatus[]>(['active', 'pending', 'pending']);

  // Step colours matching screenshot: green → blue → grey-spinner
  const STEP_COLORS = [GREEN, '#2563EB', '#9CA3AF'];

  useEffect(() => {
    // Sequence: step 0 completes → step 1 activates → step 1 completes → step 2 activates
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;
    let t4: ReturnType<typeof setTimeout>;

    const d0 = STEPS[0].duration;
    const d1 = STEPS[1].duration;
    const d2 = STEPS[2].duration;

    t1 = setTimeout(() => {
      setStatuses(['done', 'active', 'pending']);
    }, d0);

    t2 = setTimeout(() => {
      setStatuses(['done', 'done', 'active']);
    }, d0 + d1);

    t3 = setTimeout(() => {
      setStatuses(['done', 'done', 'done']);
    }, d0 + d1 + d2);

    t4 = setTimeout(() => {
      // Navigate to the next screen once all steps are complete
      // Adjust target + params as needed for your navigator
      navigation?.navigate('ManualScore', route?.params ?? {});
    }, d0 + d1 + d2 + 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <View style={styles.root}>
      {/* Soft gradient background blobs */}
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />

      {/* Header area */}
      <View style={styles.headerArea}>
        {/* Top-right arc spinner */}
        <View style={styles.topRightSpinner}>
          <HeaderSpinner />
        </View>

        {/* App icon */}
        <View style={styles.appIconWrapper}>
          <Text style={styles.appIconEmoji}>✦</Text>
        </View>

        <Text style={styles.title}>Analyzing Grain Sample</Text>
        <Text style={styles.subtitle}>Generating AI draft classification...</Text>
      </View>

      {/* Step list card */}
      <View style={styles.card}>
        {STEPS.map((step, i) => (
          <React.Fragment key={step.label}>
            <StepRow
              label={step.label}
              status={statuses[i]}
              color={STEP_COLORS[i]}
            />
            {i < STEPS.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          <Text style={styles.infoBannerBold}>On-device inference: </Text>
          Processing locally for offline capability
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
    paddingTop: 80,
  },

  // Background blobs
  blobTopLeft: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0, 130, 54, 0.07)',
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
  },

  // Header
  headerArea: {
    alignItems: 'center',
    marginBottom: 32,
  },

  topRightSpinner: {
    position: 'absolute',
    top: -20,
    right: -10,
  },

  headerSpinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: GREEN,
    borderRightColor: GREEN,
  },

  appIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },

  appIconEmoji: {
    fontSize: 38,
    color: '#FFFFFF',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
  },

  // Step row
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },

  stepDotWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dotCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dotCheck: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
  },

  stepBody: {
    flex: 1,
    gap: 7,
  },

  stepLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },

  stepLabelDim: {
    color: '#9CA3AF',
  },

  progressTrack: {
    height: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Info banner
  infoBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  infoBannerText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },

  infoBannerBold: {
    fontWeight: '700',
    color: '#B45309',
  },
});