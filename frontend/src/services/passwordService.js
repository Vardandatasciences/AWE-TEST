import axios from 'axios';

// Create a base axios instance with defaults
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }
});

// Functions for password change functionality
export const passwordService = {
  // Get current user data
  getUserData: async () => {
    try {
      const response = await api.get('/user-data');
      return response.data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  },
  
  // Verify current password
  verifyPassword: async (currentPassword) => {
    try {
      const response = await api.post('/changepassword', {
        step: 'verify',
        current_password: currentPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying password:', error);
      throw error;
    }
  },
  
  // Save new password
  resetPassword: async (newPassword, confirmNewPassword) => {
    try {
      const response = await api.post('/changepassword', {
        step: 'reset',
        new_password: newPassword,
        confirm_new_password: confirmNewPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }
};

export default api;