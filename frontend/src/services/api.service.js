import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

// Create a base axios instance with default configuration
const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Activities
export const activitiesService = {
  getAll: () => apiClient.get(API_ENDPOINTS.ACTIVITIES),
  add: (activity) => apiClient.post(API_ENDPOINTS.ADD_ACTIVITY, activity),
  update: (activity) => apiClient.put(API_ENDPOINTS.UPDATE_ACTIVITY, activity),
  delete: (id) => apiClient.delete(API_ENDPOINTS.DELETE_ACTIVITY(id)),
  assign: (assignmentData) => apiClient.post(API_ENDPOINTS.ASSIGN_ACTIVITY, assignmentData)
};

// Actors
export const actorsService = {
  getAll: () => apiClient.get(API_ENDPOINTS.ACTORS),
  getForAssignment: () => apiClient.get(API_ENDPOINTS.ACTORS_ASSIGN),
  add: (actor) => apiClient.post(API_ENDPOINTS.ADD_ACTOR, actor),
  update: (actor) => apiClient.put(API_ENDPOINTS.UPDATE_ACTOR, actor),
  delete: (id) => apiClient.delete(API_ENDPOINTS.DELETE_ACTOR(id))
};

// Customers
export const customersService = {
  getAll: () => apiClient.get(API_ENDPOINTS.CUSTOMERS),
  getForAssignment: () => apiClient.get(API_ENDPOINTS.CUSTOMERS_ASSIGN),
  add: (customer) => apiClient.post(API_ENDPOINTS.ADD_CUSTOMER, customer),
  update: (customer) => apiClient.put(API_ENDPOINTS.UPDATE_CUSTOMER, customer),
  delete: (id) => apiClient.delete(API_ENDPOINTS.DELETE_CUSTOMER(id))
};

// Tasks
export const tasksService = {
  getAll: () => apiClient.get(API_ENDPOINTS.TASKS),
  update: (taskId, data) => apiClient.patch(`${API_ENDPOINTS.TASKS}/${taskId}`, data),
  delete: (taskId) => apiClient.delete(`${API_ENDPOINTS.TASKS}/${taskId}`),
  create: (data) => apiClient.post(API_ENDPOINTS.TASKS, data)
};

// Groups
export const groupsService = {
  getAll: () => apiClient.get(API_ENDPOINTS.GROUPS)
};

// Messages
export const messagesService = {
  add: (message) => apiClient.post(API_ENDPOINTS.ADD_MESSAGE, message),
  getDescriptions: () => apiClient.get(API_ENDPOINTS.MESSAGE_DESCRIPTIONS)
};

// Reports
export const reportsService = {
  viewActivityReport: () => apiClient.get(API_ENDPOINTS.VIEW_ACTIVITY_REPORT),
  getActivityData: (activityId) => apiClient.post(API_ENDPOINTS.GET_ACTIVITY_DATA, { activity_id: activityId }),
  generateActivityReport: () => apiClient.get(API_ENDPOINTS.GENERATE_ACTIVITY_REPORT, { responseType: 'blob' }),
  viewEmployeeReport: () => apiClient.get(API_ENDPOINTS.VIEW_EMPLOYEE_REPORT),
  getEmployeeData: (actorId) => apiClient.post(API_ENDPOINTS.GET_EMPLOYEE_DATA, { actor_id: actorId }),
  generateEmployeeReport: () => apiClient.get(API_ENDPOINTS.GENERATE_EMPLOYEE_REPORT, { responseType: 'blob' }),
  getReports: (type) => apiClient.get(`${API_ENDPOINTS.REPORTS}?type=${type}`)
};

// Analytics
export const analyticsService = {
  getAnalytics: (timeRange) => apiClient.get(`${API_ENDPOINTS.ANALYTICS}?timeRange=${timeRange}`)
};

// Combined API service for export
const apiService = {
  // Tasks
  getTasks: () => apiClient.get(API_ENDPOINTS.TASKS),
  updateTask: (taskId, data) => apiClient.patch(`${API_ENDPOINTS.TASKS}/${taskId}`, data),
  deleteTask: (taskId) => apiClient.delete(`${API_ENDPOINTS.TASKS}/${taskId}`),
  createTask: (data) => apiClient.post(API_ENDPOINTS.TASKS, data),

  // Analytics
  getAnalytics: (timeRange) => apiClient.get(`${API_ENDPOINTS.ANALYTICS}?timeRange=${timeRange}`),

  // Reports
  getReports: (type) => apiClient.get(`${API_ENDPOINTS.REPORTS}?type=${type}`),

  // Employees
  getactors: () => apiClient.get(API_ENDPOINTS.EMPLOYEES || '/api/actors')
};

export default apiService; 