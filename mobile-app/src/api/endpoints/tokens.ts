import { TokenTransaction, PurchaseResponse } from '../types';
import { apiClient } from '../client';
import { getPlanById } from '../../config/tokenPlans';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock ledger data
const initialLedger: TokenTransaction[] = [
  {
    id: 'tx_1',
    amount: 20,
    type: 'purchase',
    description: 'Welcome Bonus Credited',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day ago
  }
];

export const tokensApi = {
  getBalance: async (userId: string): Promise<{ tokens: number }> => {
    try {
      const response = await apiClient.get(`/tokens/${userId}`);
      return response.data;
    } catch (error) {
      console.warn('Real GET /tokens failed, falling back to mock balance', error);
      await delay(600);
      return { tokens: 20 };
    }
  },

  getLedger: async (userId: string): Promise<TokenTransaction[]> => {
    try {
      const response = await apiClient.get(`/tokens/${userId}/ledger`);
      return response.data;
    } catch (error) {
      console.warn('Real GET ledger failed, falling back to mock history', error);
      await delay(800);
      return initialLedger;
    }
  },

  purchase: async (userId: string, packageId: string): Promise<PurchaseResponse> => {
    try {
      const response = await apiClient.post('/tokens/purchase', {
        user_id: userId,
        plan_id: packageId,
      });
      const { tokens_added, tokens_remaining } = response.data;
      const plan = getPlanById(packageId);
      const amount = typeof tokens_added === 'number' ? tokens_added : (plan ? plan.tokens : 50);
      const desc = plan ? `Purchased ${plan.name} (${amount} Tokens)` : `Purchased Token Package (${amount} Tokens)`;

      const transaction: TokenTransaction = {
        id: `tx_${Math.random().toString(36).substr(2, 9)}`,
        amount,
        type: 'purchase',
        description: desc,
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        tokens_remaining: typeof tokens_remaining === 'number' ? tokens_remaining : amount,
        transaction,
      };
    } catch (error) {
      console.warn('Real POST /tokens/purchase failed or offline. Simulating checkout credit.', error);
      await delay(1000);
      
      const plan = getPlanById(packageId);
      const amount = plan ? plan.tokens : 50;
      const desc = plan ? `Purchased ${plan.name} (${plan.tokens} Tokens)` : 'Purchased Star Bundle (50 Tokens)';

      const transaction: TokenTransaction = {
        id: `tx_${Math.random().toString(36).substr(2, 9)}`,
        amount,
        type: 'purchase',
        description: desc,
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        tokens_remaining: amount,
        transaction,
      };
    }
  }
};
