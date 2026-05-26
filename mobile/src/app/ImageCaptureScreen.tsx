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
  const sample_identifier = route?.params?.sample_identifier ?? 'SMP-2026-001';
  const sessionId = route?.params?.sessionId;

  const cameraRef = useRef<CameraHandle>(null);

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
      navigation.navigate('ImagePreview', {
        imageUri: photo.uri,
        sampleId,
        sample_identifier,
        variety,
        grainCount,
        session,
        sessionId
      });
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
      navigation.navigate('ImagePreview', {
        imageUri: result.assets[0].uri,
        sampleId,
        sample_identifier,
        variety,
        grainCount,
        session,
        sessionId
      });
    }
  }

  return (
    <View style={styles.root}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Image Capture</Text>
      </View>

      {/* INFO */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoLine1}>
          {sample_identifier} • {variety} • {grainCount} grains
        </Text>

        <Text style={styles.infoLine2}>
          Session: {session}
        </Text>
      </View>

      {/* CAMERA */}
      <View style={styles.cameraSection}>

        {/* PILLS */}
        <View style={styles.pillRow}>

          <View style={styles.pill}>
            <Image
              source={require('../../assets/lightingIcon.png')}
              style={styles.pillIcon}
            />
            <Text style={styles.pillText}>
              Good lighting
            </Text>
          </View>

          <View style={styles.pill}>
            <Image
              source={require('../../assets/distanceIcon.png')}
              style={styles.pillIcon}
            />
            <Text style={styles.pillText}>
              15cm distance
            </Text>
          </View>

        </View>

        {/* VIEWFINDER */}
        <View style={styles.viewfinderOuter}>
          <View style={styles.viewfinderInner}>

            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
            />

            <View
              pointerEvents="none"
              style={styles.placeholderOverlay}
            >
              <Image
                source={require('../../assets/cameraIcon.png')}
                style={styles.cameraIconImage}
              />

              <Text style={styles.placeholderText}>
                Position grain sample
              </Text>
            </View>

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
        >
          <Text style={styles.galleryText}>
            Gallery
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureBtn}
          onPress={handleCapture}
        >
          <Text style={styles.captureText}>
            Capture
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
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

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
  },

  infoLine2: {
    color: '#8B949E',
    fontSize: 13,
    marginTop: 3,
  },

  cameraSection: {
    flex: 1,
    paddingHorizontal: 16,
  },

  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#21262D',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#30363D',
  },

  pillIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },

  pillText: {
    color: '#E6EDF3',
    fontSize: 13,
    fontWeight: '500',
  },

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
  },

  placeholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraIconImage: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
    opacity: 0.7,
    marginBottom: 14,
  },

  placeholderText: {
    color: '#C9D1D9',
    fontSize: 15,
    fontWeight: '500',
  },

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

  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: '#161B22',
  },

  galleryBtn: {
    flex: 1,
    backgroundColor: '#21262D',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },

  galleryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  captureBtn: {
    flex: 1.4,
    backgroundColor: GREEN,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },

  captureText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});