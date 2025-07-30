import { useState, useEffect } from 'react';
import { goalsAPI, walletAPI } from '@/services/apiServices';
import { Alert } from 'react-native';

export interface Goal {
  id: string;
  name: string;
  description: string;
  associated_tokens: number;
  target_time: string;
  is_default: boolean;
  user_id?: string;
  is_claimed?: boolean;
}

export interface Wallet {
  id: string;
  user_id: string;
  discipline_purse: number;
  focus_purse: number;
  mindfulness_purse: number;
  created_at: string;
  updated_at: string;
}

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await goalsAPI.getGoals();
      setGoals(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch goals';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createCustomGoal = async (goalData: {
    name: string;
    description: string;
    associated_tokens: number;
    target_time: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const newGoal = await goalsAPI.createCustomGoal(goalData);
      setGoals(prev => [...prev, newGoal]);
      return newGoal;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create goal';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const completeGoal = async (goalId: string, completed: boolean) => {
    try {
      setLoading(true);
      setError(null);
      await goalsAPI.completeGoal({ goal_id: goalId, completed });
      // Optionally refresh goals list
      await fetchGoals();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to complete goal';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  return {
    goals,
    loading,
    error,
    fetchGoals,
    createCustomGoal,
    completeGoal,
  };
};

export const useWallet = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transferTokens = async (transferData: {
    to_user_id?: string;
    to_purse: string;
    from_purse: string;
    amount: number;
    type: 'peer' | 'self-transfer' | 'charity';
    charity_info?: any;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await walletAPI.transferTokens(transferData);
      Alert.alert('Success', 'Transfer completed successfully!');
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Transfer failed';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    transferTokens,
    loading,
    error,
  };
};
