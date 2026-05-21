import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Camera, { CameraHandle } from '../components/camera';

const GREEN = '#008236';

const GUIDELINES = [
  'Place grains within the dashed guide',
  'Ensure even lighting across the sample',
  'Maintain 15cm camera distance',
  'Avoid shadows and reflections',
];

export default function ImageCaptureScreen({ navigation, route }: any) {
  const sampleId = route?.params?.sampleId ?? 'S003';
  const variety = route?.params?.variety ?? 'NSIC Rc 222';
  const grainCount = route?.params?.grainCount ?? '10';
  const session = route?.params?.session ?? 'Spring Harvest 2026';

  const cameraRef = useRef<CameraHandle>(null);

  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  const [permission, requestPermission] = useCameraPermissions();

  async function handleCapture() {
    if (!permission?.granted) {
      const result = await requestPermission();

      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to capture grain images.'
        );
        return;
      }
    }

    const photo = await cameraRef.current?.takePicture();

    if (photo?.uri) {
      setCapturedUri(photo.uri);
    }
  }

  async function handleGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setCapturedUri(result.assets[0].uri);
    }
  }

  function handleRetake() {
    setCapturedUri(null);
  }

  function handleProceed() {
    if (!capturedUri) return;

    navigation?.navigate('AnalysisResult', {
      imageUri: capturedUri,
      sampleId,
      variety,
      grainCount,
      session,
    });
  }

  return (
    <View style={styles.root}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Image Capture</Text>
      </View>

      {/* SAMPLE INFO */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoLine1}>
          {sampleId} • {variety} • {grainCount} grains
        </Text>

        <Text style={styles.infoLine2}>
          Session: {session}
        </Text>
      </View>

      {/* CAMERA SECTION */}
      <View style={styles.cameraSection}>

        {/* HINT PILLS */}
        <View style={styles.pillRow}>

          <View style={styles.pill}>
            <Image source={require('../../assets/lightingIcon.png')} />
            <Text style={styles.pillText}> Good lighting </Text>
          </View>

          <View style={styles.pill}>
            <Image source={require('../../assets/distanceIcon.png')} />
            <Text style={styles.pillText}> 15cm distance </Text>
          </View>

        </View>

        {/* VIEWFINDER */}
        <View style={styles.viewfinderOuter}>
          <View style={styles.viewfinderInner}>

            {capturedUri ? (
              <>
                <Image
                  source={{ uri: capturedUri }}
                  style={styles.capturedImage}
                />

                <TouchableOpacity
                  style={styles.retakeOverlay}
                  onPress={handleRetake}
                >
                  <Text style={styles.retakeText}>
                    ↺ Retake
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* CAMERA */}
                <Camera
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                />

                {/* CAMERA OVERLAY */}
                <View
                  pointerEvents="none"
                  style={styles.placeholderOverlay}
                >
                  <Image source={require('../../assets/cameraIcon.png')} style={styles.cameraIconImage} />

                  <Text style={styles.placeholderText}>
                    Position grain sample
                  </Text>
                </View>
              </>
            )}

          </View>
        </View>
      </View>

      {/* GUIDELINES */}
      <View style={styles.guidelinesCard}>

        <Text style={styles.guidelinesTitle}>
          Positioning Guidelines:
        </Text>

        {GUIDELINES.map((text) => (
          <View key={text} style={styles.guidelineRow}>

            <View style={styles.checkbox}>
              <Text style={styles.checkmark}>✓</Text>
            </View>

            <Text style={styles.guidelineText}>
              {text}
            </Text>

          </View>
        ))}

      </View>

      {/* FOOTER */}
      <View style={styles.footer}>

        <TouchableOpacity
          style={styles.galleryBtn}
          onPress={handleGallery}
          activeOpacity={0.8}
        >
          <Image source={require('../../assets/galleryIcon.png')} />

          <Text style={styles.galleryText}>
            Gallery
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.captureBtn,
            !!capturedUri && styles.proceedBtn,
          ]}
          onPress={capturedUri ? handleProceed : handleCapture}
          activeOpacity={0.85}
        >
          <Text style={styles.captureIcon}>
            <Image source={require('../../assets/cameraIcon2.png')} />
          </Text>

          <Text style={styles.captureText}>
            {capturedUri ? 'Use Photo' : 'Capture'}
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D1117',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },

  backButton: {
    padding: 4,
  },

  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  // INFO BANNER
  infoBanner: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#21262D',
  },

  infoLine1: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 3,
  },

  infoLine2: {
    color: '#8B949E',
    fontSize: 13,
  },

  // CAMERA SECTION
  cameraSection: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // PILLS
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  pill: {
    flexDirection: 'row',
    backgroundColor: '#21262D',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#30363D',
  },

  pillText: {
    color: '#E6EDF3',
    fontSize: 13,
    fontWeight: '500',
  },

  // VIEWFINDER
  viewfinderOuter: {
    flex: 1,
    padding: 3,
  },

  viewfinderInner: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#444C56',
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: '#161B22',
  },

  // OVERLAY
  placeholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraIconImage: {
    width: 72,
    height: 72,
    marginBottom: 14,
    resizeMode: 'contain',
    opacity: 0.7,
  },

  placeholderText: {
    color: '#C9D1D9',
    fontSize: 15,
    fontWeight: '500',
  },

  // CAPTURED IMAGE
  capturedImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },

  retakeOverlay: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  retakeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // GUIDELINES
  guidelinesCard: {
    backgroundColor: '#161B22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#21262D',
    marginTop: 12,
  },

  guidelinesTitle: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },

  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#30363D',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#21262D',
  },

  checkmark: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '700',
  },

  guidelineText: {
    color: '#8B949E',
    fontSize: 13,
    flex: 1,
  },

  // FOOTER
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: '#161B22',
    borderTopWidth: 1,
    borderTopColor: '#21262D',
  },

  galleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#21262D',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },

  galleryIcon: {
    fontSize: 18,
  },

  galleryText: {
    color: '#E6EDF3',
    fontSize: 15,
    fontWeight: '600',
  },

  captureBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#006228',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  proceedBtn: {
    backgroundColor: '#006228',
  },

  captureIcon: {
    fontSize: 18,
  },

  captureText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});