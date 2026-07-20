import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api'
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem('hkcs_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const loginAdmin = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

// Dashboard
export const getDashboardStats = () => API.get('/admin/stats');

// Analytics
export const getAnalytics = () => API.get('/admin/analytics');
export const getAttendanceTrends = () => API.get('/admin/analytics/attendance-trends');

// Parent Management
export const getAllParents = () => API.get('/admin/parents');
export const getParentDetails = (id) => API.get(`/admin/parents/${id}`);
export const updateParentStatus = (id, data) => API.put(`/admin/parents/${id}/status`, data);

// Financial Reports
export const getFinancialReport = (params) => API.get('/admin/financial-report', { params });

// Incident Management
export const getIncidents = () => API.get('/admin/incidents');
export const getIncidentStats = () => API.get('/admin/incidents/stats');
export const updateIncidentStatus = (id, data) => API.put(`/admin/incidents/${id}/status`, data);

// Buses
export const getAllBuses = () => API.get('/admin/buses');
export const addBus = (data) => API.post('/admin/buses', data);
export const updateBus = (id, data) => API.put(`/admin/buses/${id}`, data);
export const deleteBus = (id) => API.delete(`/admin/buses/${id}`);

// Drivers
export const getAllDrivers = () => API.get('/admin/drivers');
export const addDriver = (data) => API.post('/admin/drivers', data);
export const assignDriver = (data) => API.post('/admin/drivers/assign', data);
export const unassignDriver = (id) => API.put(`/admin/drivers/${id}/unassign`);

// Students
export const getAllStudents = () => API.get('/students/all');

// Routes
export const getAllRoutes = () => API.get('/admin/routes');
export const addRoute = (data) => API.post('/admin/routes', data);
export const updateRoute = (id, data) => API.put(`/admin/routes/${id}`, data);
export const deleteRoute = (id) => API.delete(`/admin/routes/${id}`);
export const optimizeRoute = (id) => API.post(`/admin/routes/${id}/optimize`);

// Schools
export const getAllSchools = () => API.get('/admin/schools');
export const addSchool = (data) => API.post('/admin/schools', data);
export const updateSchool = (id, data) => API.put(`/admin/schools/${id}`, data);
export const deleteSchool = (id) => API.delete(`/admin/schools/${id}`);

// Reports
export const getAttendanceReport = (date) => API.get(`/admin/reports/attendance?date=${date}`);
export const getTripReport = () => API.get('/admin/reports/trips');

// Payments
export const getPayments = () => API.get('/admin/payments');
export const getPaymentStats = () => API.get('/admin/payments/stats');
export const generateInvoices = (data) => API.post('/admin/invoices/generate', data);
export const sendPaymentReminders = (data) => API.post('/admin/reminders/send', data);
export const processRefund = (data) => API.post('/admin/refund', data);

// Tracking
export const getAllBusLocations = () => API.get('/tracking/all');

// Advanced Features - Geofencing
export const getAllGeofences = () => API.get('/advanced/geofences');
export const createGeofence = (data) => API.post('/advanced/geofences', data);
export const updateGeofence = (id, data) => API.put(`/advanced/geofences/${id}`, data);
export const deleteGeofence = (id) => API.delete(`/advanced/geofences/${id}`);
export const getGeofenceAlerts = (params) => API.get('/advanced/geofences/alerts', { params });
export const acknowledgeGeofenceAlert = (id) => API.put(`/advanced/geofences/alerts/${id}/acknowledge`);

// Advanced Features - Driver Behavior
export const logDriverBehavior = (data) => API.post('/advanced/driver-behavior', data);
export const getDriverBehaviorLogs = (params) => API.get('/advanced/driver-behavior/logs', { params });
export const getDriverBehaviorScores = () => API.get('/advanced/driver-behavior/scores');
export const getDriverBehaviorScore = (driverId) => API.get(`/advanced/driver-behavior/scores/${driverId}`);

// Advanced Features - Offline Sync
export const queueOfflineAction = (data) => API.post('/advanced/offline/queue', data);
export const getOfflineQueue = (params) => API.get('/advanced/offline/queue', { params });
export const syncOfflineActions = (data) => API.post('/advanced/offline/sync', data);

export default API;
