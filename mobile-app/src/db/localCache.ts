import * as SQLite from 'expo-sqlite';
import { CREATE_CHARTS_TABLE, CREATE_REPORTS_TABLE, CREATE_CHATS_TABLE } from './schema';
import { KundaliChart, FullReport, ChatMessage } from '../api/types';

let db: any = null;

// In-Memory cache fallback for Web and Test environments where SQLite is mock/unavailable
const memoryCache = {
  charts: new Map<string, string>(),
  reports: new Map<string, string>(),
  chats: new Map<string, string>(),
};

export const localCache = {
  initDb: async () => {
    try {
      db = SQLite.openDatabaseSync('astrogpt.db');
      db.execSync(CREATE_CHARTS_TABLE);
      db.execSync(CREATE_REPORTS_TABLE);
      db.execSync(CREATE_CHATS_TABLE);
      console.log('Local SQLite offline cache database initialized.');
    } catch (error) {
      console.warn('SQLite init failed; using in-memory cache fallback:', error);
      db = null;
    }
  },

  saveChart: async (chart: KundaliChart) => {
    const payload = JSON.stringify(chart);
    if (!db) {
      memoryCache.charts.set(chart.id, payload);
      memoryCache.charts.set(`latest_${chart.userId}`, payload);
      return;
    }
    try {
      db.runSync(
        `INSERT OR REPLACE INTO cached_charts (id, user_id, payload, created_at) VALUES (?, ?, ?, ?)`,
        [chart.id, chart.userId, payload, chart.createdAt]
      );
    } catch (error) {
      console.error('Failed to cache chart locally', error);
    }
  },

  getChart: async (chartId: string): Promise<KundaliChart | null> => {
    if (!db) {
      const cached = memoryCache.charts.get(chartId);
      return cached ? JSON.parse(cached) : null;
    }
    try {
      const row: any = db.getFirstSync(
        `SELECT payload FROM cached_charts WHERE id = ?`,
        [chartId]
      );
      return row ? JSON.parse(row.payload) : null;
    } catch (error) {
      console.error('Failed to read cached chart', error);
      return null;
    }
  },

  getLatestChart: async (userId: string): Promise<KundaliChart | null> => {
    if (!db) {
      const cached = memoryCache.charts.get(`latest_${userId}`);
      return cached ? JSON.parse(cached) : null;
    }
    try {
      const row: any = db.getFirstSync(
        `SELECT payload FROM cached_charts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      return row ? JSON.parse(row.payload) : null;
    } catch (error) {
      console.error('Failed to read latest cached chart', error);
      return null;
    }
  },

  saveReport: async (report: FullReport) => {
    const payload = JSON.stringify(report);
    if (!db) {
      memoryCache.reports.set(report.chartId, payload);
      return;
    }
    try {
      db.runSync(
        `INSERT OR REPLACE INTO cached_reports (id, user_id, chart_id, payload, created_at) VALUES (?, ?, ?, ?, ?)`,
        [report.id, report.userId, report.chartId, payload, report.createdAt]
      );
    } catch (error) {
      console.error('Failed to cache report locally', error);
    }
  },

  getReport: async (chartId: string): Promise<FullReport | null> => {
    if (!db) {
      const cached = memoryCache.reports.get(chartId);
      return cached ? JSON.parse(cached) : null;
    }
    try {
      const row: any = db.getFirstSync(
        `SELECT payload FROM cached_reports WHERE chart_id = ?`,
        [chartId]
      );
      return row ? JSON.parse(row.payload) : null;
    } catch (error) {
      console.error('Failed to read cached report', error);
      return null;
    }
  },

  saveChats: async (chartId: string, messages: ChatMessage[]) => {
    const payload = JSON.stringify(messages);
    if (!db) {
      memoryCache.chats.set(chartId, payload);
      return;
    }
    try {
      db.runSync(
        `INSERT OR REPLACE INTO cached_chats (chart_id, payload, updated_at) VALUES (?, ?, ?)`,
        [chartId, payload, new Date().toISOString()]
      );
    } catch (error) {
      console.error('Failed to cache chats locally', error);
    }
  },

  getChats: async (chartId: string): Promise<ChatMessage[] | null> => {
    if (!db) {
      const cached = memoryCache.chats.get(chartId);
      return cached ? JSON.parse(cached) : null;
    }
    try {
      const row: any = db.getFirstSync(
        `SELECT payload FROM cached_chats WHERE chart_id = ?`,
        [chartId]
      );
      return row ? JSON.parse(row.payload) : null;
    } catch (error) {
      console.error('Failed to read cached chats', error);
      return null;
    }
  }
};
export default localCache;
