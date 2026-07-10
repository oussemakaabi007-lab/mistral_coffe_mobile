import axios from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: 'https://mistralcoffeback-production.up.railway.app/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const storedUser = await SecureStore.getItemAsync('userData');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          await api.post('/auth/logout-expired', {
            utilisateurId: user.id
          });
        }
      } catch (logoutError) {
        console.error("Failed to process server-side logout:", logoutError);
      } finally {
        await SecureStore.deleteItemAsync('userData');
        await SecureStore.deleteItemAsync('userToken');
        router.replace('/Login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;