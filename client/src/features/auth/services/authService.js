import apiClient from '../../../services/apiClient';

export const authService = {
  login: async (email, password) => {
    return apiClient('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  logout: async () => {
    return apiClient('/auth/logout', {
      method: 'POST',
    });
  },

  getCurrentUser: async () => {
    return apiClient('/auth/me');
  },
};

export default authService;

