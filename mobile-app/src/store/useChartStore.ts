import { create } from 'zustand';
import { KundaliChart, FullReport, ChatMessage, BirthDetails } from '../api/types';
import { kundaliApi } from '../api/endpoints/kundali';
import { reportApi } from '../api/endpoints/report';
import { chatApi } from '../api/endpoints/chat';
import { useTokenStore } from './useTokenStore';

interface ChartState {
  activeChart: KundaliChart | null;
  activeReport: FullReport | null;
  chatMessages: ChatMessage[];
  isGeneratingChart: boolean;
  isGeneratingReport: boolean;
  isSendingMessage: boolean;
  
  clearStore: () => void;
  generateChart: (userId: string, details: BirthDetails) => Promise<KundaliChart>;
  generateReport: (userId: string, chartId: string) => Promise<FullReport>;
  loadCachedReport: (userId: string, chartId: string) => Promise<FullReport | null>;
  sendChatMessage: (userId: string, text: string) => Promise<void>;
  setExtractedChart: (chart: KundaliChart) => void;
}

export const useChartStore = create<ChartState>((set, get) => ({
  activeChart: null,
  activeReport: null,
  chatMessages: [],
  isGeneratingChart: false,
  isGeneratingReport: false,
  isSendingMessage: false,

  clearStore: () => {
    set({
      activeChart: null,
      activeReport: null,
      chatMessages: [],
    });
  },

  setExtractedChart: (chart: KundaliChart) => {
    // Proactively seed the chat with a context-based greeting
    const initialGreeting: ChatMessage = {
      id: 'msg_greet',
      role: 'assistant',
      content: `Greetings! I have mapped your birth chart. I notice you have a powerful Gajakesari Yoga in your 1st house under Jupiter. Also, your current Ketu sub-period runs until early 2026. What would you like to explore first—your personality path, or your career timings?`,
      timestamp: new Date().toISOString(),
    };
    
    set({
      activeChart: chart,
      activeReport: null,
      chatMessages: [initialGreeting],
    });
  },

  generateChart: async (userId: string, details: BirthDetails): Promise<KundaliChart> => {
    set({ isGeneratingChart: true });
    try {
      const chart = await kundaliApi.generate(userId, details);
      
      // Deduct 5 tokens for chart generation
      useTokenStore.getState().spendTokens(5, `Generated Kundali for ${details.name}`);

      // Seed chat history with context-specific starter
      const initialGreeting: ChatMessage = {
        id: 'msg_greet',
        role: 'assistant',
        content: `Welcome, ${details.name}. I have cast your Kundali. I notice that your Ascendant Lord Jupiter is positioned directly in your 1st house in Sagittarius, forming a powerful Gajakesari Yoga with your Pisces Moon. Also, your Ketu antardasha runs until February 2026. Want to talk about what this means for your life path or career?`,
        timestamp: new Date().toISOString(),
      };

      set({
        activeChart: chart,
        chatMessages: [initialGreeting],
        activeReport: null, // Clear old report
        isGeneratingChart: false,
      });

      // Cache locally for offline reading
      try {
        const { localCache } = require('../db/localCache');
        await localCache.saveChart(chart);
      } catch (cacheError) {
        console.warn('Failed to write chart to offline cache', cacheError);
      }

      return chart;
    } catch (error: any) {
      set({ isGeneratingChart: false });
      if (error?.response?.status === 402) {
        useTokenStore.getState().setPaywallVisible(true);
      }
      console.error('Failed to generate chart', error);
      throw error;
    }
  },

  generateReport: async (userId: string, chartId: string): Promise<FullReport> => {
    set({ isGeneratingReport: true });
    try {
      const report = await reportApi.generateReport(userId, chartId);
      
      // Deduct 5 tokens for report generation
      useTokenStore.getState().spendTokens(5, 'Generated Full Vedic Report');
      
      set({
        activeReport: report,
        isGeneratingReport: false,
      });

      // Cache locally for offline reading
      try {
        const { localCache } = require('../db/localCache');
        await localCache.saveReport(report);
      } catch (cacheError) {
        console.warn('Failed to write report to offline cache', cacheError);
      }

      return report;
    } catch (error: any) {
      set({ isGeneratingReport: false });
      if (error?.response?.status === 402) {
        useTokenStore.getState().setPaywallVisible(true);
      }
      console.error('Failed to generate report', error);
      throw error;
    }
  },

  loadCachedReport: async (userId: string, chartId: string): Promise<FullReport | null> => {
    set({ isGeneratingReport: true });
    try {
      const report = await reportApi.fetchReport(userId, chartId);
      set({
        activeReport: report,
        isGeneratingReport: false,
      });
      return report;
    } catch (error) {
      set({ isGeneratingReport: false });
      console.error('Failed to fetch report', error);
      return null;
    }
  },

  sendChatMessage: async (userId: string, text: string) => {
    const activeChart = get().activeChart;
    if (!activeChart) return;

    const userMessage: ChatMessage = {
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const currentHistory = get().chatMessages;
    const updatedHistory = [...currentHistory, userMessage];

    set({
      chatMessages: updatedHistory,
      isSendingMessage: true,
    });

    try {
      const tokenStore = useTokenStore.getState();
      const response = await chatApi.sendMessage(
        userId,
        activeChart.id,
        updatedHistory,
        tokenStore.tokens
      );

      // Spend 2 tokens for chat message
      tokenStore.spendTokens(2, 'Astrological Chat Consultation');

      set({
        chatMessages: [...updatedHistory, response.message],
        isSendingMessage: false,
      });

      // Cache chat messages for offline reading
      try {
        const { localCache } = require('../db/localCache');
        await localCache.saveChats(activeChart.id, [...updatedHistory, response.message]);
      } catch (cacheError) {
        console.warn('Failed to write chat history to offline cache', cacheError);
      }
    } catch (error: any) {
      set({ isSendingMessage: false });
      if (error?.response?.status === 402) {
        useTokenStore.getState().setPaywallVisible(true);
      }
      console.error('Failed to get chat response', error);
      throw error;
    }
  }
}));
