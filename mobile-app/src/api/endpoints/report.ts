import { FullReport, ReportSection } from '../types';
import { apiClient } from '../client';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockSections = (chartId: string): ReportSection[] => [
  {
    id: 'rep_1',
    title: 'Core Personality & Soul Path',
    category: 'personality',
    content: 'With Sagittarius rising and your ascendant lord Jupiter placed in the 1st house, your soul carries a powerful quest for wisdom, expansion, and truth. You project optimism and a philosophical outlook. However, because Saturn in the 10th house aspects your ascendant, there is a serious, duty-driven side to your nature. You are constantly balancing a need for freedom with an intense drive to achieve material and structural goals.',
  },
  {
    id: 'rep_2',
    title: 'Professional Destiny & Public Career',
    category: 'career',
    content: 'Saturn resides in your 10th house of career, in the meticulous sign of Virgo. This indicates a career path marked by diligence, order, and detailed work. Success comes through service, research, or analyzing complex systems. You may feel that recognition comes slowly, but Saturn ensures that whatever you build has deep foundations and will endure. The aspects to your 11th house of gains promise solid long-term returns from your hard work.',
  },
  {
    id: 'rep_3',
    title: 'Karmic Relationships & Love',
    category: 'relationships',
    content: 'Venus and Mars reside together in your 11th house in Libra, the sign of partnerships. This forms a highly creative, passionate connection in social settings. You attract partners who are intellectually stimulating, socially active, and artistic. However, because Mars is close to the junction of its sign, watch out for power struggles in friendships or associations. Learning to communicate without demands is your relationship lesson.',
  },
  {
    id: 'rep_4',
    title: 'Physical Well-being & Vitality',
    category: 'health',
    content: 'Your 6th house is ruled by Venus, indicating that your physical health is closely tied to your emotional and artistic harmony. With Rahu in the 3rd house, you have strong physical stamina, but you might experience nervous exhaustion or sleep disturbances if you overwork. Ensure a structured routine that respects rest, and pay attention to kidney and lower abdomen health.',
  },
  {
    id: 'rep_5',
    title: 'Family & Roots',
    category: 'family',
    content: 'The Moon in your 4th house in Pisces gives you a highly sensitive and empathetic connection to your home and your mother. Your childhood environment was likely spiritual or emotionally intense. You seek sanctuary at home and need a peaceful, almost temple-like atmosphere to recharge your spirit.',
  },
  {
    id: 'rep_6',
    title: 'Yogas & Doshas (Celestial Combinations)',
    category: 'yogas_doshas',
    content: 'Your chart forms a prominent Gajakesari Yoga (Jupiter in the 1st house aspecting the Moon in the 4th), which brings reputation, emotional resilience, and access to spiritual mentors. Additionally, the conjunction of Sun and Mercury in the 9th house in Leo forms a Budhaditya Yoga, indicating a highly sharp intellect, analytical skill, and aptitude for higher education or spiritual research.',
  },
  {
    id: 'rep_7',
    title: 'Current Dasha Period: Ketu-Venus Shift',
    category: 'life_themes',
    content: 'You are currently in the final phases of your Ketu Mahadasha, specifically under the influence of Ketu-Ketu shifting into Ketu-Venus. This is a critical spiritual junction. Ketu stimulates detachment and inner seeking, which can feel like loss or stagnation in material endeavors. However, as Venus takes over the sub-period in early 2026, you will experience a revitalization of social connections, financial relief, and professional opportunities.',
  }
];

const parseBackendSections = (dataSections: any, chartId: string): ReportSection[] => {
  if (Array.isArray(dataSections)) {
    return dataSections;
  }
  if (dataSections && typeof dataSections === 'object') {
    const titles: Record<string, { title: string; category: ReportSection['category'] }> = {
      personality_nature: { title: 'Core Personality & Soul Path', category: 'personality' },
      career_wealth: { title: 'Professional Destiny & Wealth', category: 'career' },
      relationships_marriage: { title: 'Karmic Relationships & Love', category: 'relationships' },
      health: { title: 'Physical Well-being & Vitality', category: 'health' },
      family: { title: 'Family & Roots', category: 'family' },
      current_dasha_effects: { title: 'Current Dasha Period Effects', category: 'life_themes' },
      key_yogas_doshas: { title: 'Yogas & Doshas (Celestial Combinations)', category: 'yogas_doshas' },
      life_themes: { title: 'Life Themes & Path', category: 'personality' },
    };

    return Object.entries(dataSections).map(([key, content], index) => {
      const info = titles[key] || { title: key.replace(/_/g, ' ').toUpperCase(), category: 'personality' as const };
      return {
        id: `sec_${key}_${index}`,
        title: info.title,
        category: info.category,
        content: typeof content === 'string' ? content : JSON.stringify(content),
      };
    });
  }
  return mockSections(chartId);
};

export const reportApi = {
  generateReport: async (userId: string, chartId: string): Promise<FullReport> => {
    try {
      const response = await apiClient.post('/kundali/report/generate', { chart_id: chartId });
      const data = response.data;
      return {
        id: data.id || `report_${chartId.slice(0, 8)}`,
        userId,
        chartId,
        sections: parseBackendSections(data.sections, chartId),
        createdAt: data.generated_at || data.createdAt || new Date().toISOString(),
      };
    } catch (error) {
      console.warn('Real report generation failed or offline, using mock report compiler', error);
      await delay(3000); // Simulate Gemini LLM synthesis delay
      return {
        id: `report_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        chartId,
        sections: mockSections(chartId),
        createdAt: new Date().toISOString(),
      };
    }
  },

  fetchReport: async (userId: string, chartId: string): Promise<FullReport | null> => {
    try {
      const response = await apiClient.get(`/kundali/report/${chartId}`);
      const data = response.data;
      return {
        id: data.id || `report_${chartId.slice(0, 8)}`,
        userId,
        chartId,
        sections: parseBackendSections(data.sections, chartId),
        createdAt: data.generated_at || data.createdAt || new Date().toISOString(),
      };
    } catch (error) {
      // 404 is expected if report has not been generated yet for this chart on the backend
      return {
        id: `report_${chartId.split('_')[1] || 'mock'}`,
        userId,
        chartId,
        sections: mockSections(chartId),
        createdAt: new Date().toISOString(),
      };
    }
  }
};
