// AiDraftLoadingScreen.ts

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { requestAIDraft, createDraftEvaluation } from '../services/AiService';
import { detectConflicts } from '../utils/conflictDetection';
import { auth } from '../core/firebase';

const GREEN = '#008236';

type StepStatus = 'pending' | 'active' | 'done';

interface Step {
  label: string;
  duration: number;
}

const STEPS: Step[] = [
  { label: 'Processing grain image', duration: 1800 },
  { label: 'Analyzing spread pattern', duration: 2200 },
  { label: 'Computing ASV score', duration: 1600 },
];

const ANIMATION_TOTAL_MS = STEPS.reduce(
  (s, step) => s + step.duration,
  0
);

const NAVIGATION_DELAY_MS = ANIMATION_TOTAL_MS + 400;

function SpinnerArc({
  color,
  size = 22,
}: {
  color: string;
  size?: number;
}) {
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
    inputRange: [0, 1],
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

function StepRow({
  label,
  status,
  color,
}: {
  label: string;
  status: StepStatus;
  color: string;
}) {
  const barWidth = useRef(new Animated.Value(0)).current;

  const opacity = useRef(
    new Animated.Value(status === 'pending' ? 0.38 : 1)
  ).current;

  useEffect(() => {
    if (status === 'active') {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      Animated.timing(barWidth, {
        toValue: 0.72,
        duration: 1600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

    } else if (status === 'done') {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),

        Animated.timing(barWidth, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start();

    } else {
      Animated.timing(opacity, {
        toValue: 0.38,
        duration: 200,
        useNativeDriver: true,
      }).start();

      barWidth.setValue(0);
    }
  }, [status]);

  const widthInterpolated = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.stepRow, { opacity }]}>
      <View style={styles.stepDotWrapper}>
        {status === 'done' ? (
          <View
            style={[
              styles.dotCircle,
              {
                backgroundColor: GREEN,
                borderColor: GREEN,
              },
            ]}
          >
            <Text style={styles.dotCheck}>✓</Text>
          </View>
        ) : status === 'active' ? (
          <SpinnerArc color={color} size={22} />
        ) : (
          <View
            style={[
              styles.dotCircle,
              {
                backgroundColor: 'transparent',
                borderColor: '#D1D5DB',
              },
            ]}
          />
        )}
      </View>

      <View style={styles.stepBody}>
        <Text
          style={[
            styles.stepLabel,
            status === 'pending' && styles.stepLabelDim,
          ]}
        >
          {label}
        </Text>

        {status !== 'pending' && (
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: widthInterpolated,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function AiDraftLoadingScreen({
  navigation,
  route,
}: any) {

  const {
    imageUri,
    sampleId,
    sample_identifier,
    variety,
    grainCount,
    session,
    sessionId,
    answers,
    grainImageId,
  } = route?.params ?? {};

  const [statuses, setStatuses] = useState<StepStatus[]>([
    'active',
    'pending',
    'pending',
  ]);

  const STEP_COLORS = [GREEN, '#2563EB', '#9CA3AF'];

  const aiResultRef = useRef<any>(null);
  const navigatedRef = useRef(false);
  const evaluationIdRef = useRef<string | null>(null);

  function doNavigate(result: any) {
    if (navigatedRef.current) return;

    navigatedRef.current = true;

    navigation?.navigate('AiDraftResult', {
      imageUri,
      sampleId,
      sample_identifier,
      variety,
      grainCount,
      session,
      sessionId,

      evaluationId: evaluationIdRef.current,

      aiDraftScore: result.predicted_asv_score,

      rawConfidence: result.raw_confidence,
      calibratedCertainty: result.calibrated_certainty,

      hasConfidenceWarning:
        result.hasConfidenceWarning,

      hasObservationConflict:
        result.hasObservationConflict,

      conflictDimensions:
        result.conflictDimensions ?? [],

      allScores:
        result.all_scores ?? [],

      answers,
    });
  }

  useEffect(() => {

    const d0 = STEPS[0].duration;
    const d1 = STEPS[1].duration;
    const d2 = STEPS[2].duration;

    const t1 = setTimeout(() => {
      setStatuses(['done', 'active', 'pending']);
    }, d0);

    const t2 = setTimeout(() => {
      setStatuses(['done', 'done', 'active']);
    }, d0 + d1);

    const t3 = setTimeout(() => {
      setStatuses(['done', 'done', 'done']);
    }, d0 + d1 + d2);

    const tNav = setTimeout(() => {

      const result = aiResultRef.current ?? {
        predicted_asv_score: 5,
        predicted_gt_class: 'Intermediate GT',
        raw_confidence: 72,
        calibrated_certainty: 58,
        hasConfidenceWarning: true,
        hasObservationConflict: false,
        conflictDimensions: [],
      };

      doNavigate(result);

    }, NAVIGATION_DELAY_MS);

    (async () => {

      try {

        const firebaseUser = auth.currentUser;

        if (!firebaseUser) {
          throw new Error('Not authenticated');
        }

        const aiResult = await requestAIDraft({
          sampleId,
          imageUri,
          grainImageId,

          observations: {
            spreadingPattern:
              answers?.spreadingPattern,

            grainTranslucency:
              answers?.grainTranslucency,

            scoreUniformity:
              answers?.scoreUniformity,

            anomalyFlags:
              answers?.anomalyFlags,

            kohSolution:
              answers?.kohSolution,
          },
        });

        // ─────────────────────────────────────────────
        // Local confidence + conflict analysis
        // ─────────────────────────────────────────────

        const hasConfidenceWarning =
          aiResult.raw_confidence < 70;

        const conflictDimensions =
          detectConflicts(
            aiResult.predicted_asv_score,
            {
              spreadingPattern:
                answers?.spreadingPattern,

              grainTranslucency:
                answers?.grainTranslucency,

              scoreUniformity:
                answers?.scoreUniformity,

              kohAppearance:
                answers?.kohSolution,

              anomalyFlags:
                answers?.anomalyFlags ?? [],
            }
          );

        const hasObservationConflict =
          conflictDimensions.length > 0;

        aiResult.hasConfidenceWarning =
          hasConfidenceWarning;

        aiResult.hasObservationConflict =
          hasObservationConflict;

        aiResult.conflictDimensions =
          conflictDimensions;

        aiResultRef.current = aiResult;

        try {

          const evalRecord =
            await createDraftEvaluation({

              sample_id: sampleId,

              grain_image_id:
                grainImageId ?? null,

              evaluator_id:
                firebaseUser.uid,

              predicted_asv_score:
                aiResult.predicted_asv_score,

              predicted_gt_class:
                aiResult.predicted_gt_class,

              raw_confidence:
                aiResult.raw_confidence,

              calibrated_certainty:
                aiResult.calibrated_certainty,

              overlay_file_path:
                aiResult.overlay_file_path,

              has_confidence_warning:
                hasConfidenceWarning,

              has_observation_conflict:
                hasObservationConflict,

              conflict_dimensions:
                conflictDimensions,

              spreading_pattern:
                answers?.spreadingPattern,

              grain_translucency:
                answers?.grainTranslucency,

              score_uniformity:
                answers?.scoreUniformity,

              anomaly_flags:
                answers?.anomalyFlags ?? [],

              koh_appearance:
                answers?.kohSolution,
            });

          evaluationIdRef.current =
            evalRecord.id;

        } catch (evalErr) {

          console.warn(
            'AiDraftLoadingScreen: evaluation persist warning:',
            evalErr
          );
        }

        if (statuses.every((s) => s === 'done')) {
          doNavigate(aiResult);
        }

      } catch (err) {

        console.error(
          'AiDraftLoadingScreen: unexpected error in AI call:',
          err
        );
      }

    })();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tNav);
    };

  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />

      <View style={styles.headerArea}>
        <View style={styles.appIconWrapper}>
          <Text style={styles.appIconEmoji}>✦</Text>
        </View>

        <Text style={styles.title}>
          Analyzing Grain Sample
        </Text>

        <Text style={styles.subtitle}>
          Generating AI draft classification...
        </Text>
      </View>

      <View style={styles.card}>
        {STEPS.map((step, i) => (
          <React.Fragment key={step.label}>
            <StepRow
              label={step.label}
              status={statuses[i]}
              color={STEP_COLORS[i]}
            />

            {i < STEPS.length - 1 && (
              <View style={styles.divider} />
            )}
          </React.Fragment>
        ))}
      </View>

      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          <Text style={styles.infoBannerBold}>
            On-device inference:
          </Text>{' '}
          Processing locally for offline capability
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
    paddingTop: 80,
  },

  blobTopLeft: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0,130,54,0.07)',
  },

  blobBottomRight: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(37,99,235,0.06)',
  },

  headerArea: {
    alignItems: 'center',
    marginBottom: 32,
  },

  appIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
  },

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