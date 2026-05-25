import { apiClient } from './client';
import { auth } from '../core/firebase';

let attached = false;

export function attachInterceptors(): void {
  if (attached) return;
  attached = true;

  apiClient.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken(false);
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (
        error.response?.status === 401 &&
        auth.currentUser &&
        !originalRequest.headers['X-Retried']
      ) {
        originalRequest.headers['X-Retried'] = '1';
        const token = await auth.currentUser.getIdToken(true);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient.request(originalRequest);
      }
      return Promise.reject(error);
    }
  );
}
