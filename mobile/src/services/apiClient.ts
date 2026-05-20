import SSLPinning from 'react-native-ssl-pinning';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';
const isDev = process.env.EXPO_PUBLIC_APP_ENV === 'development';

export async function apiPost(endpoint: string, body: object) {
    // Skip SSL pinning in development

    if (isDev) {
        const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        });
        return response.json();
    }

    const response = await SSLPinning.fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        },
        body: JSON.stringify(body),
        sslPinning: {
        certs: ['cert'],  // place your cert in mobile/assets/certs/cert.cer
        },
    });
    return response.json();
}

export async function apiGet(endpoint: string, token?: string) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    if (isDev) {
        const response = await fetch(`${API_URL}${endpoint}`, { headers });
        return response.json();
    }

    const response = await SSLPinning.fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers,
        sslPinning: { certs: ['cert'] },
    });
    return response.json();
}