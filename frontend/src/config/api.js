// API configuration
const API_BASE_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  // Activities
  ACTIVITIES: '/activities',
  ADD_ACTIVITY: `${API_BASE_URL}/add_activity`,
  DELETE_ACTIVITY: (id) => `${API_BASE_URL}/delete_activity/${id}`,
  UPDATE_ACTIVITY: `${API_BASE_URL}/update_activity`,
  
  // Actors
  ACTORS: 'http://127.0.0.1:5000/actors',
  ACTORS_ASSIGN: `${API_BASE_URL}/actors_assign`,
  ADD_ACTOR: `${API_BASE_URL}/add_actor`,
  DELETE_ACTOR: (id) => `${API_BASE_URL}/delete_actor/${id}`,
  UPDATE_ACTOR: `${API_BASE_URL}/update_actor`,
  
  // Customers
  CUSTOMERS: 'http://127.0.0.1:5000/customers_assign',
  CUSTOMERS_ASSIGN: `${API_BASE_URL}/customers_assign`,
  ADD_CUSTOMER: `${API_BASE_URL}/add_customer`,
  DELETE_CUSTOMER: (id) => `${API_BASE_URL}/delete_customer/${id}`,
  UPDATE_CUSTOMER: `${API_BASE_URL}/update_customer`,
  
  // Tasks
  TASKS: `${API_BASE_URL}/tasks`,
  
  // Groups
  GROUPS: `${API_BASE_URL}/groups`,
  
  // Messages
  ADD_MESSAGE: `${API_BASE_URL}/add_message`,
  MESSAGE_DESCRIPTIONS: `${API_BASE_URL}/message_descriptions`,
  
  // Activity Assignment
  ASSIGN_ACTIVITY: `${API_BASE_URL}/assign_activity`,
  
  // Reports
  VIEW_ACTIVITY_REPORT: `${API_BASE_URL}/view_activity_report`,
  GET_ACTIVITY_DATA: `${API_BASE_URL}/get_activity_data`,
  GENERATE_ACTIVITY_REPORT: `${API_BASE_URL}/generate_activity_report`,
  VIEW_EMPLOYEE_REPORT: `${API_BASE_URL}/view_employee_report`,
  GET_EMPLOYEE_DATA: `${API_BASE_URL}/get_employee_data`,
  GENERATE_EMPLOYEE_REPORT: `${API_BASE_URL}/generate_employee_report`,
  
  // Analysis
  ANALYSIS: `${API_BASE_URL}/analysis/`,

  ANALYTICS: `${API_BASE_URL}/analytics`,
  REPORTS: `${API_BASE_URL}/reports`,

  ACTIVITY_MAPPINGS: (id) => `http://127.0.0.1:5000/activity_mappings/${id}`
};

export default API_ENDPOINTS; 