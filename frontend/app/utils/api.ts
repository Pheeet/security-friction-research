import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  withCredentials: true,
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // 🛡️ STATELESS: Always attempt to attach token if it exists in sessionStorage
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('token');
      if (token) {
        // console.log(`[Diagnostic] Axios Interceptor: Attaching token to ${config.url}`);
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401s centrally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("[Diagnostic] 401 Unauthorized - Session may have expired.");
      // Optional: Clear session and redirect if we get a 401 on a protected route
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
         // sessionStorage.clear();
         // window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
