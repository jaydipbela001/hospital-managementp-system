import apiClient from '../../../services/apiClient';

export const authService = {
  login: async (email, password) => {
    return apiClient('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  registerPatient: async (data) => {
    return apiClient('/auth/register', {
      method: 'POST',
      body: data,
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

