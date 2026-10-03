import { KundaliChart, BirthDetails, DivisionalChart, DailyInsight, CompatibilityResponse, NumerologyData } from '../types';
import { apiClient } from '../client';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to generate the premium North Indian Kundali SVG
export const generateNorthIndianSvg = (ascSign: number, planetsByHouse: Record<number, string[]>) => {
  // SVG size: 300x300
  // Houses coordinates center-anchored for positioning text
  const housePositions: Record<number, { x: number; y: number; labelX: number; labelY: number }> = {
    1: { x: 150, y: 85, labelX: 150, labelY: 65 },    // Top-Center Diamond
    2: { x: 75, y: 45, labelX: 95, labelY: 35 },      // Top-Left Triangle
    3: { x: 45, y: 75, labelX: 35, labelY: 95 },      // Upper-Left Triangle
    4: { x: 85, y: 150, labelX: 65, labelY: 150 },    // Left-Center Diamond
    5: { x: 45, y: 225, labelX: 35, labelY: 205 },    // Lower-Left Triangle
    6: { x: 75, y: 255, labelX: 95, labelY: 265 },    // Bottom-Left Triangle
    7: { x: 150, y: 215, labelX: 150, labelY: 235 },  // Bottom-Center Diamond
    8: { x: 225, y: 255, labelX: 205, labelY: 265 },  // Bottom-Right Triangle
    9: { x: 255, y: 225, labelX: 265, labelY: 205 },  // Lower-Right Triangle
    10: { x: 215, y: 150, labelX: 235, labelY: 150 }, // Right-Center Diamond
    11: { x: 255, y: 75, labelX: 265, labelY: 95 },   // Upper-Right Triangle
    12: { x: 225, y: 45, labelX: 205, labelY: 35 },   // Top-Right Triangle
  };

  const lines = [
    // Outer Frame
    '<rect x="10" y="10" width="280" height="280" rx="12" stroke="#D4AF37" stroke-width="2.5" fill="#12111A" />',
    // Main Diagonals
    '<line x1="10" y1="10" x2="290" y2="290" stroke="#D4AF37" stroke-width="1.5" stroke-opacity="0.8" />',
    '<line x1="290" y1="10" x2="10" y2="290" stroke="#D4AF37" stroke-width="1.5" stroke-opacity="0.8" />',
    // Inner Diamond
    '<line x1="150" y1="10" x2="290" y2="150" stroke="#D4AF37" stroke-width="1.5" stroke-opacity="0.8" />',
    '<line x1="290" y1="150" x2="150" y2="290" stroke="#D4AF37" stroke-width="1.5" stroke-opacity="0.8" />',
    '<line x1="150" y1="290" x2="10" y2="150" stroke="#D4AF37" stroke-width="1.5" stroke-opacity="0.8" />',
    '<line x1="10" y1="150" x2="150" y2="10" stroke="#D4AF37" stroke-width="1.5" stroke-opacity="0.8" />',
  ];

  // Draw house sign labels (small, muted gold)
  for (let house = 1; house <= 12; house++) {
    const signNum = ((ascSign - 1 + (house - 1)) % 12) + 1;
    const pos = housePositions[house];
    lines.push(
      `<text x="${pos.labelX}" y="${pos.labelY}" fill="#8F7833" font-size="10" font-family="System" font-weight="bold" text-anchor="middle">${signNum}</text>`
    );

    // Draw planets in this house
    const planets = planetsByHouse[house] || [];
    if (planets.length > 0) {
      planets.forEach((planet, index) => {
        // Offset text if multiple planets exist in the same house
        const offsetY = index * 14 - ((planets.length - 1) * 7);
        lines.push(
          `<text x="${pos.x}" y="${pos.y + offsetY + 4}" fill="#F3F4F6" font-size="11" font-family="System" font-weight="bold" text-anchor="middle">${planet}</text>`
        );
      });
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">${lines.join('')}</svg>`;
};

// Create a realistic astrological chart
const mockChartData = (details: BirthDetails): KundaliChart => {
  const planetsByHouse: Record<number, string[]> = {
    1: ['As', 'Ju'],       // Ascendant and Jupiter (Gajakesari Yoga trigger)
    3: ['Ra'],             // Rahu
    4: ['Mo'],             // Moon in 4th house (conjoint Gajakesari effect)
    5: ['Ve'],             // Venus
    9: ['Su', 'Me', 'Ke'], // Sun, Mercury (Budhaditya), and Ketu
    10: ['Sa'],            // Saturn
    11: ['Ma'],            // Mars
  };

  return {
    id: `chart_${Math.random().toString(36).substr(2, 9)}`,
    userId: 'user_active',
    birthDetails: details,
    planets: [
      { planet: 'Ascendant', sign: 'Sagittarius', house: 1, degree: 14.5, nakshatra: 'Purva Ashadha', nakshatraLord: 'Venus', isRetrograde: false },
      { planet: 'Sun', sign: 'Leo', house: 9, degree: 7.2, nakshatra: 'Magha', nakshatraLord: 'Ketu', isRetrograde: false },
      { planet: 'Moon', sign: 'Pisces', house: 4, degree: 21.8, nakshatra: 'Revati', nakshatraLord: 'Mercury', isRetrograde: false },
      { planet: 'Mercury', sign: 'Leo', house: 9, degree: 15.3, nakshatra: 'Purva Phalguni', nakshatraLord: 'Venus', isRetrograde: false },
      { planet: 'Venus', sign: 'Libra', house: 5, degree: 2.1, nakshatra: 'Chitra', nakshatraLord: 'Mars', isRetrograde: false },
      { planet: 'Mars', sign: 'Libra', house: 11, degree: 29.4, nakshatra: 'Vishakha', nakshatraLord: 'Jupiter', isRetrograde: false },
      { planet: 'Jupiter', sign: 'Sagittarius', house: 1, degree: 11.2, nakshatra: 'Mula', nakshatraLord: 'Ketu', isRetrograde: false },
      { planet: 'Saturn', sign: 'Virgo', house: 10, degree: 18.9, nakshatra: 'Hasta', nakshatraLord: 'Moon', isRetrograde: true },
      { planet: 'Rahu', sign: 'Aquarius', house: 3, degree: 25.1, nakshatra: 'Purva Bhadrapada', nakshatraLord: 'Jupiter', isRetrograde: false },
      { planet: 'Ketu', sign: 'Leo', house: 9, degree: 25.1, nakshatra: 'Purva Phalguni', nakshatraLord: 'Venus', isRetrograde: false },
    ],
    dashas: [
      { planet: 'Jupiter', startDate: '2020-05-18', endDate: '2036-05-18', type: 'mahadasha', isActive: true },
      { planet: 'Saturn', startDate: '2020-05-18', endDate: '2022-11-30', type: 'antardasha', isActive: false },
      { planet: 'Mercury', startDate: '2022-11-30', endDate: '2025-03-08', type: 'antardasha', isActive: false },
      { planet: 'Ketu', startDate: '2025-03-08', endDate: '2026-02-12', type: 'antardasha', isActive: true },
      { planet: 'Venus', startDate: '2026-02-12', endDate: '2029-10-12', type: 'antardasha', isActive: false },
      { planet: 'Sun', startDate: '2029-10-12', endDate: '2030-08-30', type: 'antardasha', isActive: false },
    ],
    ascendant: 'Sagittarius',
    ascendantDegree: 14.5,
    svgString: generateNorthIndianSvg(9, planetsByHouse), // 9 is Sagittarius
    createdAt: new Date().toISOString(),
  };
};

export const kundaliApi = {
  generate: async (userId: string, details: BirthDetails): Promise<KundaliChart> => {
    try {
      const response = await apiClient.post('/kundali/generate', {
        user_id: userId,
        name: details.name,
        dob: details.dateOfBirth,
        time_of_birth: details.timeOfBirth,
        place_of_birth: details.placeOfBirth,
      });
      const data = response.data;
      return {
        id: data.chart_id || data.id || `chart_${Math.random().toString(36).substr(2, 9)}`,
        userId: data.user_id || userId,
        birthDetails: details,
        planets: data.planets || [],
        dashas: data.dashas || [],
        ascendant: data.ascendant || 'Sagittarius',
        ascendantDegree: data.ascendantDegree || data.ascendant_degree || 14.5,
        svgString: data.svgString || data.svg_string || generateNorthIndianSvg(9, {}),
        createdAt: data.createdAt || data.generated_at || new Date().toISOString(),
      };
    } catch (error) {
      console.warn('Real POST /kundali/generate failed, using mock chart fallback', error);
      await delay(1500);
      return mockChartData(details);
    }
  },

  upload: async (userId: string, fileUri: string, onProgress?: (progress: number) => void): Promise<{ extractedDetails: BirthDetails }> => {
    // Simulate multi-stage upload & OCR extraction progress
    for (let i = 1; i <= 5; i++) {
      await delay(500);
      if (onProgress) onProgress(i * 20);
    }
    await delay(800);
    
    return {
      extractedDetails: {
        name: 'Extracted Seeker',
        dateOfBirth: '1995-08-20',
        timeOfBirth: '08:45',
        placeOfBirth: 'New Delhi, India',
        latitude: 28.6139,
        longitude: 77.2090,
      }
    };
  },

  resolvePlace: async (query: string): Promise<Array<{ description: string; lat: number; lng: number }>> => {
    try {
      const response = await apiClient.get('/places/search', { params: { q: query } });
      return response.data.map((item: any) => ({
        description: item.display_name,
        lat: item.latitude,
        lng: item.longitude,
      }));
    } catch (error) {
      console.warn('Real /places/search failed or offline. Using mock fallback.', error);
      await delay(400);
      const mockPlaces = [
        { description: 'New Delhi, Delhi, India', lat: 28.6139, lng: 77.2090 },
        { description: 'New York, NY, USA', lat: 40.7128, lng: -74.0060 },
        { description: 'London, UK', lat: 51.5074, lng: -0.1278 },
        { description: 'Mumbai, Maharashtra, India', lat: 19.0760, lng: 72.8777 },
        { description: 'Sydney, NSW, Australia', lat: -33.8688, lng: 151.2093 },
      ];
      return mockPlaces.filter(p => p.description.toLowerCase().includes(query.toLowerCase()));
    }
  },

  getDivisionalChart: async (chartId: string, division: 'D9' | 'D10'): Promise<DivisionalChart> => {
    try {
      const response = await apiClient.get(`/kundali/${chartId}/divisional/${division}`);
      return response.data;
    } catch (error) {
      console.warn(`Real GET /kundali/${chartId}/divisional/${division} failed, falling back to mock`, error);
      await delay(400);
      return {
        chart_id: chartId,
        division,
        ascendant_sign: division === 'D9' ? 'Scorpio' : 'Leo',
        planets: [
          { planet: 'Sun', sign: 'Aries', house: 1 },
          { planet: 'Moon', sign: 'Taurus', house: 2 },
          { planet: 'Mars', sign: 'Scorpio', house: 8 },
          { planet: 'Mercury', sign: 'Gemini', house: 3 },
          { planet: 'Jupiter', sign: 'Sagittarius', house: 9 },
          { planet: 'Venus', sign: 'Libra', house: 7 },
          { planet: 'Saturn', sign: 'Capricorn', house: 10 },
          { planet: 'Rahu', sign: 'Taurus', house: 2 },
          { planet: 'Ketu', sign: 'Scorpio', house: 8 },
        ]
      };
    }
  },

  getDailyInsight: async (chartId: string): Promise<DailyInsight> => {
    try {
      const response = await apiClient.get(`/kundali/${chartId}/daily`);
      return response.data;
    } catch (error) {
      console.warn(`Real GET /kundali/${chartId}/daily failed, falling back to mock`, error);
      await delay(400);
      return {
        chart_id: chartId,
        energy: 'High Focus & Intuition',
        focus: 'Career alignment and spiritual reflection',
        guidance: 'Jupiter transiting your 9th house enhances wisdom. Take calculated steps towards long-term goals.',
        caution: null,
        transits_used: [
          { planet: 'Jupiter', transit_sign: 'Taurus', house: 9 }
        ]
      };
    }
  },

  checkCompatibility: async (chartIdA: string, chartIdB: string): Promise<CompatibilityResponse> => {
    try {
      const response = await apiClient.post('/kundali/compatibility', {
        chart_id_a: chartIdA,
        chart_id_b: chartIdB,
      });
      return response.data;
    } catch (error) {
      console.warn('Real POST /kundali/compatibility failed, falling back to mock', error);
      await delay(600);
      return {
        manglik_a: {
          is_manglik: true,
          mars_house: 7,
          reason: 'Mars in house 7 — traditionally considered a Manglik placement',
        },
        manglik_b: {
          is_manglik: false,
          mars_house: 3,
          reason: 'Mars in house 3 — not a traditional Manglik placement',
        },
        ashta_koota: {
          scores: {
            varna: 1,
            vashya: null,
            tara: 3,
            yoni: null,
            graha_maitri: null,
            gana: 6,
            bhakoot: null,
            nadi: 8,
          },
          partial_total: 18,
          partial_out_of: 18,
          is_complete: false,
          validated: false,
        }
      };
    }
  },

  listCharts: async (userId: string): Promise<Array<{ chart_id: string; name: string; generated_at: string }>> => {
    try {
      const response = await apiClient.get('/kundali/list');
      return response.data;
    } catch (error) {
      console.warn('Real GET /kundali/list failed, falling back to mock list', error);
      await delay(400);
      return [
        { chart_id: 'chart_1', name: 'Natal Chart (Self)', generated_at: new Date().toISOString() },
        { chart_id: 'chart_2', name: "Partner's Chart", generated_at: new Date().toISOString() },
      ];
    }
  },

  generateNumerology: async (chartId: string): Promise<NumerologyData> => {
    try {
      const response = await apiClient.post(`/kundali/${chartId}/numerology/generate`);
      return response.data;
    } catch (error) {
      console.warn(`Real POST /kundali/${chartId}/numerology/generate failed, using fallback`, error);
      await delay(800);
      return {
        chart_id: chartId,
        numbers: {
          life_path_number: 7,
          destiny_number: 5,
          soul_urge_number: 3,
          personality_number: 2,
          birthday_number: 8,
          maturity_number: 3,
        },
        sections: {
          life_path_meaning: "Life Path 7 represents an analytical mind, spiritual seeker, and seeker of truth.",
          destiny_meaning: "Destiny 5 brings adaptability, freedom, and dynamic life experiences.",
          soul_urge_meaning: "Soul Urge 3 reflects a deep desire for creative self-expression and joy.",
          personality_meaning: "Personality 2 shows a gentle, diplomatic, and approachable exterior.",
          overall_synthesis: "Your numerology profile synthesizes analytical wisdom with a free-spirited drive for creative expression.",
        },
        generated_at: new Date().toISOString(),
      };
    }
  },

  getNumerology: async (chartId: string): Promise<NumerologyData | null> => {
    try {
      const response = await apiClient.get(`/kundali/${chartId}/numerology`);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      console.warn(`Real GET /kundali/${chartId}/numerology failed, falling back to null`, error);
      return null;
    }
  }
};
