import { create } from 'zustand';
import { TokenTransaction } from '../api/types';
import { tokensApi } from '../api/endpoints/tokens';

interface TokenState {
  tokens: number;
  ledger: TokenTransaction[];
  isPaywallVisible: boolean;
  isLoading: boolean;
  setPaywallVisible: (visible: boolean) => void;
  fetchBalanceAndLedger: (userId: string) => Promise<void>;
  spendTokens: (amount: number, description: string) => void;
  buyTokens: (userId: string, packageId: string) => Promise<boolean>;
}

export const useTokenStore = create<TokenState>((set, get) => ({
  tokens: 20, // Default start value
  ledger: [],
  isPaywallVisible: false,
  isLoading: false,

  setPaywallVisible: (visible: boolean) => {
    set({ isPaywallVisible: visible });
  },

  fetchBalanceAndLedger: async (userId: string) => {
    set({ isLoading: true });
    try {
      const balanceRes = await tokensApi.getBalance(userId);
      const ledgerRes = await tokensApi.getLedger(userId);
      const validTokens = typeof balanceRes.tokens === 'number' && !isNaN(balanceRes.tokens) ? balanceRes.tokens : 20;
      set({
        tokens: validTokens,
        ledger: Array.isArray(ledgerRes) ? ledgerRes : [],
        isLoading: false,
      });
      
      // Keep session store in sync
      const { useSessionStore } = require('./useSessionStore');
      useSessionStore.getState().updateUserTokens(validTokens);
    } catch (error) {
      console.error('Failed to fetch token details', error);
      set({ isLoading: false });
    }
  },

  spendTokens: (amount: number, description: string) => {
    const currentTokens = typeof get().tokens === 'number' && !isNaN(get().tokens) ? get().tokens : 20;
    const newBalance = Math.max(0, currentTokens - amount);
    
    const newTx: TokenTransaction = {
      id: `tx_${Math.random().toString(36).substr(2, 9)}`,
      amount: -amount,
      type: 'spend',
      description,
      timestamp: new Date().toISOString(),
    };

    set({
      tokens: newBalance,
      ledger: [newTx, ...get().ledger],
    });

    // Keep session store in sync
    const { useSessionStore } = require('./useSessionStore');
    useSessionStore.getState().updateUserTokens(newBalance);
  },

  buyTokens: async (userId: string, packageId: string): Promise<boolean> => {
    try {
      const response = await tokensApi.purchase(userId, packageId);
      if (response && response.success) {
        const current = typeof get().tokens === 'number' && !isNaN(get().tokens) ? get().tokens : 20;
        const addedAmount = response.transaction?.amount || 50;
        const nextBalance = typeof response.tokens_remaining === 'number' && !isNaN(response.tokens_remaining)
          ? response.tokens_remaining
          : current + addedAmount;

        set({
          tokens: nextBalance,
          ledger: response.transaction ? [response.transaction, ...get().ledger] : get().ledger,
          isPaywallVisible: false,
        });

        // Sync with session store
        const { useSessionStore } = require('./useSessionStore');
        useSessionStore.getState().updateUserTokens(nextBalance);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to complete token purchase api call', error);
      return false;
    }
  }
}));
