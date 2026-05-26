import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { submitImage } from '../services/ImageSubmissionService';
import { getSampleById } from '../../module1_session/services/SampleService';
import { getSessionById } from '../../module1_session/services/SessionService';
import { useAuthContext } from '../../../core/AuthContext';
import { SampleRecord } from '../../../shared/types/sample.types';
import { SessionRecord } from '../../../shared/types/session.types';
import { ChecklistState } from '../services/ImageValidationService';

const GREEN = '#008236';

// FR-M2-02: Evaluator must confirm all four physical conditions before submission.
const PROTOCOL_ITEMS: { key: keyof ChecklistState; label: string }[] = [
  { key: 'illuminationConfirmed',    label: 'UV or blacklight illumination confirmed' },
  { key: 'trayBackgroundConfirmed',  label: 'White tray background in use' },
  { key: 'grainArrangementConfirmed',label: 'Grains arranged in a single layer' },
  { key: 'dishWithinFrameConfirmed', label: 'Petri dish fully within the capture frame' },
];

export default function ImagePreviewScreen({ navigation, route }: any) {
  const { imageUri, sampleId } = route.params;
  const { user } = useAuthContext();

  const [sample, setSample] = useState<SampleRecord | null>(null);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [checklist, setChecklist] = useState<ChecklistState>({
    illuminationConfirmed: false,
    trayBackgroundConfirmed: false,
    grainArrangementConfirmed: false,
    dishWithinFrameConfirmed: false,
  });

  const allConfirmed = Object.values(checklist).every(Boolean);

  useEffect(() => {
    if (!sampleId) return;
    getSampleById(sampleId).then((s) => {
      setSample(s);
      if (s?.session_id) {
        getSessionById(s.session_id).then(setSession).catch(() => {});
      }
    }).catch(() => {});
  }, [sampleId]);

  function toggleItem(key: keyof ChecklistState) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const record = await submitImage({ sample_id: sampleId, image_path: imageUri });
      navigation.navigate('ValidationResult', {
        imageId: record.id,
        imageUri,
        sampleId,
        checklistState: checklist,
        evaluatorId: user?.uid ?? '',
      });
    } catch {
      Alert.alert('Submission Failed', 'Could not save the image. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>

        {/* HEADER */}
        <View style={styles.header}>

          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              Image Preview
            </Text>
          </View>

          <Text style={styles.headerSubtitle}>
            Sample {sample?.sample_identifier ?? sampleId}
          </Text>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              {sample?.sample_identifier ?? sampleId}
              {sample ? ` • ${sample.rice_variety} • ${sample.grain_count} grains` : ''}
            </Text>
            <Text style={styles.headerSession}>
              Session: {session?.name ?? '—'}
            </Text>
          </View>

        </View>

        {/* IMAGE CARD */}
        <View style={styles.imageCard}>
          <Text style={styles.cardTitle}>
            Captured Image
          </Text>

          <Text style={styles.cardSubtitle}>
            Review framing and lighting before submission
          </Text>

          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
          />
        </View>

        {/* FR-M2-02: Protocol Compliance Checklist — all items must be confirmed */}
        <View style={styles.complianceCard}>
          <Text style={styles.complianceTitle}>Protocol Compliance</Text>
          <Text style={styles.complianceSubtitle}>
            Confirm all conditions before submitting
          </Text>

          {PROTOCOL_ITEMS.map(({ key, label }) => {
            const confirmed = checklist[key];
            return (
              <TouchableOpacity
                key={key}
                style={styles.checkRow}
                activeOpacity={0.7}
                onPress={() => toggleItem(key)}
              >
                <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
                  {confirmed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkLabel, confirmed && styles.checkLabelChecked]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {!allConfirmed && (
            <Text style={styles.checklistHint}>
              All items must be confirmed to enable submission.
            </Text>
          )}
        </View>

      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>

<TouchableOpacity
  style={[
    styles.submitBtn,
    (!allConfirmed || submitting) && styles.submitBtnDisabled,
  ]}
  onPress={handleSubmit}
  disabled={!allConfirmed || submitting}
>
  {submitting ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <>
      <Image
        source={require('../../../../assets/cameraIcon2.png')}
        style={styles.submitIcon}
      />
      <Text style={styles.submitText}>Submit Image</Text>
    </>
  )}
</TouchableOpacity>

        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retakeText}>
            Recapture Image
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  header: {
    backgroundColor: '#008236',
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },

  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  headerSubtitle: {
    color: '#E5E7EB',
    fontSize: 15,
    marginTop: 2,
  },

  /* ✅ NEW TRANSPARENT WHITE CONTAINER */
  infoContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  infoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },

  headerSession: {
    color: '#DCFCE7',
    fontSize: 13,
    marginTop: 8,
    opacity: 0.8,
  },

  imageCard: {
    backgroundColor: '#ECFDF3',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
  },

  cardSubtitle: {
    marginTop: 6,
    color: '#15803D',
    marginBottom: 20,
  },

  previewImage: {
    width: '100%',
    height: 320,
    borderRadius: 16,
    resizeMode: 'cover',
    backgroundColor: '#D1D5DB',
  },

  complianceCard: {
    backgroundColor: '#EFF6FF',
    margin: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  complianceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4,
  },

  complianceSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  checkboxChecked: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
  },

  checkLabel: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
  },

  checkLabelChecked: {
    color: '#1D4ED8',
    fontWeight: '500',
  },

  checklistHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },

  submitBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  submitBtnDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },

  submitIcon: {
  width: 18,
  height: 18,
  resizeMode: 'contain',
},

  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  retakeBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  retakeText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
});