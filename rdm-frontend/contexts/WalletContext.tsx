import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { walletAPI } from '../services/apiServices';
import { useAuth } from './AuthContext';

interface Wallet {
  id: string;
  user_id: string;
  base_purse: number;
  reward_purse: number;
  remorse_purse: number;
  charity_purse: number;
  created_at: string;
  updated_at?: string;
}

interface WalletContextType {
  wallet: Wallet | null;
  isLoading: boolean;
  fetchWallet: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchWallet = async () => {
    if (!isAuthenticated) {
      setWallet(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const walletData = await walletAPI.getWallet();
      setWallet(walletData);
      console.log('🔄 Wallet updated:', walletData);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshWallet = async () => {
    console.log('🔃 Refreshing wallet...');
    await fetchWallet();
  };

  // Fetch wallet when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchWallet();
    } else {
      setWallet(null);
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const value: WalletContextType = {
    wallet,
    isLoading,
    fetchWallet,
    refreshWallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};