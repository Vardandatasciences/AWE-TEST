import axios from 'axios';

// Create an axios instance with default configurations
const axiosInstance = axios.create({
  baseURL: '/api', // Adjust this based on your backend URL
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure axios properly parses JSON responses
  transformResponse: [
    data => {
      // Try to parse the data as JSON
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (error) {
          console.error('Error parsing response data:', error);
          return data;
        }
      }
      return data;
    }
  ]
});

export default axiosInstance; 