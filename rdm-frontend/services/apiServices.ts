import api from './api';

export interface User {
  id: string;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

// Auth API calls
export const authAPI = {
  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/login', credentials);
    return response.data;
  },

  // Signup user
  signup: async (credentials: SignupCredentials): Promise<AuthResponse> => {
    const response = await api.post('/signup', credentials);
    return response.data;
  },
};

// Goals API calls
export const goalsAPI = {
  // Get all visible goals (default + user's custom goals)
  getGoals: async () => {
    const response = await api.get('/goals');
    return response.data;
  },

  // Get default goals only
  getDefaultGoals: async () => {
    const response = await api.get('/goals/default');
    return response.data;
  },

  // Create custom goal
  createCustomGoal: async (goalData: {
    name: string;
    description: string;
    associated_tokens: number;
    target_time: string;
  }) => {
    const response = await api.post('/goals/custom', goalData);
    return response.data;
  },

  // Complete a goal
  completeGoal: async (goalData: {
    goal_id: string;
    completed: boolean;
  }) => {
    const response = await api.post('/goals/complete', goalData);
    return response.data;
  },
};

// Wallet API calls
export const walletAPI = {
  // Get user's wallet
  getWallet: async () => {
    const response = await api.get('/wallet');
    return response.data;
  },

  // Transfer tokens
  transferTokens: async (transferData: {
    to_user_id?: string;
    to_purse: string;
    from_purse: string; // Required for all transfers
    amount: number;
    type: 'peer' | 'self-transfer' | 'charity';
    charity_info?: any;
  }) => {
    const response = await api.post('/wallet/transfer', transferData);
    return response.data;
  },
};
