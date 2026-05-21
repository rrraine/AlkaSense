import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

export type CameraHandle = {
  takePicture: () => Promise<{ uri: string } | null>;
};

type Props = {
  style?: object;
};

const Camera = forwardRef<CameraHandle, Props>(({ style }, ref) => {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // REQUEST CAMERA ACCESS ON LOAD
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  useImperativeHandle(ref, () => ({
    takePicture: async () => {
      if (!cameraRef.current) return null;

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
        });

        return photo ?? null;
      } catch {
        return null;
      }
    },
  }));

  // LOADING STATE
  if (!permission) {
    return <View style={[styles.placeholder, style]} />;
  }

  // NO PERMISSION
  if (!permission.granted) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={{ color: '#8B949E' }}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  return (
    <CameraView
      ref={cameraRef}
      style={[styles.camera, style]}
      facing="back"
    />
  );
});

export default Camera;

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
});