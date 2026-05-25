import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

// TLS certificate pinning is enforced at the Android network layer.
// Configure the backend certificate fingerprint in:
//   android/app/src/main/res/xml/network_security_config.xml
// before deploying to production. This is a build-time config — not a JS-layer concern.
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30_000,
});
