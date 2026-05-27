import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { initDatabase } from './src/db/database';
import { UserProvider } from './src/core/UserContext';

import CreateSessionScreen from './src/app/CreateSessionScreen';
import LoginScreen from './src/app/LoginScreen';
import SignUpScreen from './src/app/SignUpScreen';
import DashboardScreen from './src/app/DashboardScreen';
import SessionProgressScreen from './src/app/SessionProgressScreen';
import RegisterSampleScreen from './src/app/RegisterSampleScreen';
import ImageCaptureScreen from './src/app/ImageCaptureScreen';
import ImagePreviewScreen from './src/app/ImagePreviewScreen';
import ValidationResultScreen from './src/app/ValidationResultScreen';
import ExpertObservationScreen from './src/app/ExpertObservationScreen';
import ManualScoreScreen from './src/app/ManualScoreScreen';
import ScoreConfimedScreen from './src/app/ScoreConfirmedScreen';
import SamplePreviewScreen from './src/app/SamplePreviewScreen';
import ScoreCorrectionScreen from './src/app/ScoreCorrectionScreen';
import CorrectionLogScreen from './src/app/CorrectionLogScreen';
import ReferenceLibraryScreen from './src/app/ReferenceLibraryScreen';
import BatchSummaryScreen from './src/app/BatchSummaryScreen';
import UploadReportScreen from './src/app/UploadReportScreen';
import AiRequestScreen from './src/app/AiRequestScreen';
import AiDraftLoadingScreen from './src/app/AiDraftLoadingScreen';
import AiDraftResultScreen from './src/app/AiDraftResultScreen';
import AiExplainabilityScreen from './src/app/AiExplainabilityScreen';
import AiScoreConfirmScreen from './src/app/AiScoreConfirmScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    initDatabase().catch((e: any) => console.error('DB init failed:', e.message));
  }, []);

  return (
    <UserProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="CreateSession" component={CreateSessionScreen} />
          <Stack.Screen name="SessionProgress" component={SessionProgressScreen} />
          <Stack.Screen name="RegisterSample" component={RegisterSampleScreen} />
          <Stack.Screen name="ImageCapture" component={ImageCaptureScreen} />
          <Stack.Screen name="ImagePreview" component={ImagePreviewScreen} />
          <Stack.Screen name="ValidationResult" component={ValidationResultScreen} />
          <Stack.Screen name="ExpertObservation" component={ExpertObservationScreen} />
          <Stack.Screen name="ManualScore" component={ManualScoreScreen} />
          <Stack.Screen name="ScoreConfirmed" component={ScoreConfimedScreen} />
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
      </NavigationContainer>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  logs: { marginTop: 20 },
  log: { fontSize: 13, fontFamily: 'monospace', marginBottom: 4 },
});