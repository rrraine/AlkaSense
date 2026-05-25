import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';

const GREEN = '#008236';

// FR-M2-02: These items are aligned with the Positioning Guidelines Checklist
// shown in ImageCaptureScreen, so both panels display consistent criteria.
const CHECKLIST = [
  'Place grains within the dashed guide',
  'Ensure even lighting across the sample',
  'Maintain 15cm camera distance',
  'Avoid shadows and reflections',
];

export default function ImagePreviewScreen({ navigation, route }: any) {
  const {
    imageUri,
    sampleId,
    sample_identifier,
    variety,
    grainCount,
    session,
  } = route.params;

  function handleSubmit() {
    navigation.navigate('ValidationResult', {
      imageUri,
      sampleId,
      sample_identifier,
      variety,
      grainCount,
      session,
    });
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
            Sample {sample_identifier}
          </Text>

          {/* ✅ TRANSPARENT WHITE INFO CONTAINER */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              {sample_identifier} • {variety} • {grainCount} grains
            </Text>

            <Text style={styles.headerSession}>
            Session: {session}
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

        {/* COMPLIANCE */}
        <View style={styles.complianceCard}>
          <Text style={styles.complianceTitle}>
            Protocol Compliance
          </Text>

          {CHECKLIST.map((item) => (
            <Text key={item} style={styles.checkItem}>
              ✓ {item}
            </Text>
          ))}
        </View>

      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>

<TouchableOpacity
  style={styles.submitBtn}
  onPress={handleSubmit}
>
  <Image
    source={require('../../assets/cameraIcon2.png')}
    style={styles.submitIcon}
  />

  <Text style={styles.submitText}>
    Submit Image
  </Text>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 16,
  },

  checkItem: {
    color: '#1D4ED8',
    marginBottom: 10,
    fontSize: 15,
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