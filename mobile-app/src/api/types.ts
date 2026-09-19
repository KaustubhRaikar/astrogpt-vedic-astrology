// Strict TypeScript API schemas mirroring backend models

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  tokens: number;
  createdAt: string;
}

export interface BirthDetails {
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  timeOfBirth: string; // HH:MM
  placeOfBirth: string;
  latitude: number;
  longitude: number;
}

export interface PlanetPosition {
  planet: string;
  sign: string;
  house: number;
  degree: number;
  nakshatra: string;
  nakshatraLord: string;
  isRetrograde: boolean;
}

export interface DashaPeriod {
  planet: string;
  startDate: string;
  endDate: string;
  type: 'mahadasha' | 'antardasha';
  isActive: boolean;
}

export interface KundaliChart {
  id: string;
  userId: string;
  birthDetails: BirthDetails;
  planets: PlanetPosition[];
  dashas: DashaPeriod[];
  ascendant: string;
  ascendantDegree: number;
  svgString: string; // Native SVG render source
  createdAt: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  category: 'personality' | 'career' | 'relationships' | 'health' | 'family' | 'yogas_doshas' | 'life_themes';
}

export interface FullReport {
  id: string;
  userId: string;
  chartId: string;
  sections: ReportSection[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TokenTransaction {
  id: string;
  amount: number; // e.g., +50, -5
  type: 'spend' | 'purchase';
  description: string;
  timestamp: string;
}

export interface TokenBalanceResponse {
  tokens: number;
  userId: string;
}

export interface PurchaseResponse {
  success: boolean;
  tokens_remaining: number;
  transaction: TokenTransaction;
}

export interface SpendResponse {
  success: boolean;
  tokens_remaining: number;
  cost: number;
}

export interface DivisionalPlanet {
  planet: string;
  sign: string;
  house: number;
}

export interface DivisionalChart {
  chart_id: string;
  division: 'D9' | 'D10';
  ascendant_sign: string;
  planets: DivisionalPlanet[];
}

export interface TransitInfo {
  planet: string;
  transit_sign: string;
  house: number;
}

export interface DailyInsight {
  chart_id: string;
  energy: string;
  focus: string;
  guidance: string;
  caution: string | null;
  transits_used?: TransitInfo[];
}

export interface ManglikResult {
  is_manglik: boolean;
  mars_house: number;
  reason: string;
}

export interface AshtaKootaScores {
  varna: number | null;
  vashya: number | null;
  tara: number | null;
  yoni: number | null;
  graha_maitri: number | null;
  gana: number | null;
  bhakoot: number | null;
  nadi: number | null;
}

export interface AshtaKootaResult {
  scores: AshtaKootaScores;
  partial_total: number;
  partial_out_of: number;
  is_complete: boolean;
  validated: boolean;
}

export interface CompatibilityResponse {
  manglik_a: ManglikResult;
  manglik_b: ManglikResult;
  ashta_koota: AshtaKootaResult;
}
