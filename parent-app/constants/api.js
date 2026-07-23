import { create } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_LOCAL_API_HOST = Platform.select({
  android: '10.0.2.2',
  default: 'localhost',
});

const getLocalHostFromExpo = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (!hostUri) return null;

  const cleanedHost = hostUri.replace(/^exp(s)?:\/\//, '').split('/')[0];
  const host = cleanedHost.split(':')[0];

  return host || null;
};

const resolveBaseHost = () => {
  if (process.env.EXPO_PUBLIC_API_HOST) {
    return process.env.EXPO_PUBLIC_API_HOST;
  }

  return getLocalHostFromExpo() || DEFAULT_LOCAL_API_HOST;
};

const BASE_HOST = resolveBaseHost();
const API_URL = `http://${BASE_HOST}:5000/api`;
export const SOCKET_URL = `http://${BASE_HOST}:5000`;

const API = create({ baseURL: API_URL });

API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('hkcs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token helpers
export const setToken = (token) => AsyncStorage.setItem('hkcs_token', token);
export const getToken = () => AsyncStorage.getItem('hkcs_token');
export const removeToken = () => AsyncStorage.removeItem('hkcs_token');

// Auth
export const loginUser = (data) => API.post('/auth/login', data);
export const registerUser = (data) => API.post('/auth/register', data);
export const getMe = () => API.get('/auth/me');
export const getMyStudents = () => API.get('/students/my');
export const getAssignedStudents = () => API.get('/students/assigned');

// Attendance / driver
export const startTrip = (data) => API.post('/attendance/trip/start', data);
export const endTrip = (data) => API.post('/attendance/trip/end', data);
export const getTripAttendance = (tripId) => API.get(`/attendance/trip/${tripId}`);
export const getMyAssignment = () => API.get('/attendance/driver/assignment');

// Tracking
export const getBusLocation = (bus_id) => API.get(`/tracking/bus/${bus_id}`);
export const updateLocation = (data) => API.post('/tracking/update-location', data);

// Routes
export const getRoutes = () => API.get('/routes');
export const getRouteById = (id) => API.get(`/routes/${id}`);
export const getRouteEta = (id, data) => API.post(`/routes/${id}/eta`, data);

// Attendance
export const markBoarded = (data) => API.post('/attendance/boarded', data);
export const markDropped = (data) => API.post('/attendance/dropped', data);
// Notifications
export const getNotifications = () => API.get('/notifications');
export const markAsRead = (id) => API.put(`/notifications/${id}/read`);
export const markAllRead = () => API.put('/notifications/read-all');

// Payments
export const initiateMpesaPayment = (data) => API.post('/payments/mpesa/stkpush', data);
export const getPaymentSummary = () => API.get('/payments/summary');
export const getPaymentHistory = () => API.get('/payments/history');
export const getPaymentReceipt = (id) => API.get(`/payments/receipts/${id}`);

// Transport History
export const getTransportHistory = () => API.get('/parent/transport-history');

// Schedule preview
export const getSchedulePreview = () => API.get('/parent/schedule-preview');

// Chat
export const sendChatMessage = (data) => API.post('/parent/chat/send', data);
export const getChatList = () => API.get('/parent/chat/list');
export const getConversation = (otherUserId) => API.get(`/parent/chat/conversation/${otherUserId}`);
export const markChatRead = (otherUserId) => API.put(`/parent/chat/read/${otherUserId}`);

// Absence
export const markChildAbsent = (data) => API.post('/parent/absent', data);
export const getAbsenceRecords = () => API.get('/parent/absences');

// Emergency alerts
export const getEmergencyAlerts = () => API.get('/parent/emergency-alerts');

// Pickup Change
export const requestPickupChange = (data) => API.post('/parent/pickup-change', data);
export const getPickupChangeRequests = () => API.get('/parent/pickup-changes');

export default API;
