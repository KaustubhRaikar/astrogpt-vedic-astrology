import apiClient from '../client';
import { PanchangData, MuhurtaData, MonthPanchangData } from '../types';

export const panchangApi = {
  /**
   * Fetch Panchang for a specific date (YYYY-MM-DD)
   */
  getPanchang: async (date: string, lat: number = 28.6139, lon: number = 77.2090): Promise<PanchangData> => {
    const response = await apiClient.get<PanchangData>(`/panchang/${date}`, {
      params: { lat, lon },
    });
    return response.data;
  },

  /**
   * Fetch Muhurta timing windows for a date (YYYY-MM-DD)
   */
  getMuhurta: async (date: string, lat: number = 28.6139, lon: number = 77.2090): Promise<MuhurtaData> => {
    const response = await apiClient.get<MuhurtaData>(`/muhurta/${date}`, {
      params: { lat, lon },
    });
    return response.data;
  },

  /**
   * Fetch full month Panchang & festival markers
   */
  getMonthPanchang: async (year: number, month: number, lat: number = 28.6139, lon: number = 77.2090): Promise<MonthPanchangData> => {
    const response = await apiClient.get<MonthPanchangData>(`/panchang/month/${year}/${month}`, {
      params: { lat, lon },
    });
    return response.data;
  },
};
