import { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { initDatabase } from './src/db/database';

import { SessionRepository } from './src/db/repositories/SessionRepository';
import { SampleRepository } from './src/db/repositories/SampleRepository';

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

const sessionRepo = new SessionRepository();
const sampleRepo = new SampleRepository();

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    initDatabase().catch((e: any) => console.error('DB init failed:', e.message));
  }, []);
 
  return (
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
      </Stack.Navigator>
    </NavigationContainer>
  );
  // const [logs, setLogs] = useState<string[]>([]);

  // const log = (msg: string) => setLogs(prev => [...prev, msg]);

  // useEffect(() => {
  //   initDatabase()
  //     .then(() => log('✅ Database initialized'))
  //     .catch(e => log(`❌ DB init failed: ${e.message}`));
  // }, []);

  // async function runTests() {
  //   setLogs([]);
  //   try {
  //     log('Testing session creation...');
  //     const session = await sessionRepo.create('evaluator-001', 'PhilRice Lab A', 'Test batch');
  //     log(`✅ Session created: ${session.id}`);

  //     log('Testing sample creation...');
  //     const sample = await sampleRepo.create({
  //       session_id: session.id,
  //       variety_name: 'NSIC Rc222',
  //       asv_score: 4,
  //       gt_class: 'Intermediate GT',
  //       confidence: 0.92,
  //       image_path: '/test/image.jpg',
  //     });
  //     log(`✅ Sample created: ${sample.id}`);

  //     log('Testing fetch by session...');
  //     const samples = await sampleRepo.getBySession(session.id);
  //     log(`✅ Found ${samples.length} sample(s) in session`);

  //     log('Testing correction log...');
  //     await sampleRepo.logCorrection(sample.id, 4, 5, 'Kernel too spread');
  //     log('✅ Correction logged');

  //     log('Testing session completion...');
  //     await sessionRepo.complete(session.id);
  //     const completed = await sessionRepo.getById(session.id);
  //     log(`✅ Session status: ${completed.status}`);

  //     log('Testing unsynced query...');
  //     const unsynced = await sessionRepo.getUnsynced();
  //     log(`✅ Unsynced sessions: ${unsynced.length}`);

  //     log('');
  //     log('🎉 All tests passed!');

  //   } catch (e: any) {
  //     log(`❌ Test failed: ${e.message}`);
  //   }
  

  // return (
  //   <ScrollView style={styles.container}>
  //     <Text style={styles.title}>AlkaSense DB Test</Text>
  //     <Button title="Run Tests" onPress={runTests} />
  //     <View style={styles.logs}>
  //       {logs.map((l, i) => (
  //         <Text key={i} style={styles.log}>{l}</Text>
  //       ))}
  //     </View>
  //   </ScrollView>
  // );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  logs: { marginTop: 20 },
  log: { fontSize: 13, fontFamily: 'monospace', marginBottom: 4 },
});