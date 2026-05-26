import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { initDatabase } from './src/db/database';
import { attachInterceptors } from './src/api/interceptors';
import { AuthProvider, useAuthContext } from './src/core/AuthContext';

import LoginScreen from './src/app/LoginScreen';
import SignUpScreen from './src/app/SignUpScreen';
import DashboardScreen from './src/modules/module1_session/screens/DashboardScreen';
import CreateSessionScreen from './src/modules/module1_session/screens/CreateSessionScreen';
import SessionProgressScreen from './src/modules/module1_session/screens/SessionProgressScreen';
import RegisterSampleScreen from './src/modules/module1_session/screens/RegisterSampleScreen';
import ImageCaptureScreen from './src/modules/module2_image/screens/ImageCaptureScreen';
import ImagePreviewScreen from './src/modules/module2_image/screens/ImagePreviewScreen';
import ValidationResultScreen from './src/modules/module2_image/screens/ValidationResultScreen';
import ExpertObservationScreen from './src/modules/module3_evaluation/screens/ExpertObservationScreen';
import ManualScoreScreen from './src/app/ManualScoreScreen';
import ScoreConfirmedScreen from './src/modules/module3_evaluation/screens/ScoreConfirmedScreen';
import SamplePreviewScreen from './src/app/SamplePreviewScreen';
import ScoreCorrectionScreen from './src/modules/module4_reporting/screens/ScoreCorrectionScreen';
import CorrectionLogScreen from './src/modules/module4_reporting/screens/CorrectionLogScreen';
import ReferenceLibraryScreen from './src/modules/module4_reporting/screens/ReferenceLibraryScreen';
import BatchSummaryScreen from './src/modules/module4_reporting/screens/BatchSummaryScreen';
import UploadReportScreen from './src/modules/module4_reporting/screens/UploadReportScreen';
import AiRequestScreen from './src/modules/module3_evaluation/screens/AiRequestScreen';
import AiDraftLoadingScreen from './src/modules/module3_evaluation/screens/AiDraftLoadingScreen';
import AiDraftResultScreen from './src/modules/module3_evaluation/screens/AiDraftResultScreen';
import AiExplainabilityScreen from './src/modules/module3_evaluation/screens/AiExplainabilityScreen';
import AiScoreConfirmScreen from './src/modules/module3_evaluation/screens/AiScoreConfirmScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#008236" />
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="CreateSession" component={CreateSessionScreen} />
      <Stack.Screen name="SessionProgress" component={SessionProgressScreen} />
      <Stack.Screen name="RegisterSample" component={RegisterSampleScreen} />
      <Stack.Screen name="ImageCapture" component={ImageCaptureScreen} />
      <Stack.Screen name="ImagePreview" component={ImagePreviewScreen} />
      <Stack.Screen name="ValidationResult" component={ValidationResultScreen} />
      <Stack.Screen name="ExpertObservation" component={ExpertObservationScreen} />
      <Stack.Screen name="ManualScore" component={ManualScoreScreen} />
      <Stack.Screen name="ScoreConfirmed" component={ScoreConfirmedScreen} />
      <Stack.Screen name="SamplePreview" component={SamplePreviewScreen} />
      <Stack.Screen name="ScoreCorrection" component={ScoreCorrectionScreen} />
      <Stack.Screen name="CorrectionLog" component={CorrectionLogScreen} />
      <Stack.Screen name="ReferenceLibrary" component={ReferenceLibraryScreen} />
      <Stack.Screen name="BatchSummary" component={BatchSummaryScreen} />
      <Stack.Screen name="UploadReport" component={UploadReportScreen} />
      <Stack.Screen name="AiRequest" component={AiRequestScreen} />
      <Stack.Screen name="AiDraftLoading" component={AiDraftLoadingScreen} />
      <Stack.Screen name="AiDraftResult" component={AiDraftResultScreen} />
      <Stack.Screen name="AiExplainability" component={AiExplainabilityScreen} />
      <Stack.Screen name="AiScoreConfirm" component={AiScoreConfirmScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    attachInterceptors();
    initDatabase().catch((e: any) => console.error('DB init failed:', e.message));
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
