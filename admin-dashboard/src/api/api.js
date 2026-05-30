import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api'
});

// Automatically attach token to every request
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

// Buses
export const getAllBuses = () => API.get('/admin/buses');
export const addBus = (data) => API.post('/admin/buses', data);
export const deleteBus = (id) => API.delete(`/admin/buses/${id}`);

// Drivers
export const getAllDrivers = () => API.get('/admin/drivers');
export const assignDriver = (data) => API.post('/admin/drivers/assign', data);
export const unassignDriver = (id) => API.put(`/admin/drivers/${id}/unassign`);

// Students
export const getAllStudents = () => API.get('/students/all');

// Routes
export const getAllRoutes = () => API.get('/admin/routes');
export const addRoute = (data) => API.post('/admin/routes', data);
export const updateRoute = (id, data) => API.put(`/admin/routes/${id}`, data);
export const deleteRoute = (id) => API.delete(`/admin/routes/${id}`);

// Reports
export const getAttendanceReport = (date) => API.get(`/admin/reports/attendance?date=${date}`);
export const getTripReport = () => API.get('/admin/reports/trips');

// Tracking
export const getAllBusLocations = () => API.get('/tracking/all');

export default API;
