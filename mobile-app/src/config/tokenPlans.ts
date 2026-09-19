// Single source of truth for token plans and pricing packages.

export interface TokenPlan {
  id: string;
  name: string;
  tokens: number;
  price: string;        // Formatted localized price (e.g. ₹99)
  priceNumeric: number; // Numeric cost for logic (e.g. 99)
  badge?: string;       // Optional promotional tag
  desc: string;         // Brief description
}

export const tokenPlans: TokenPlan[] = [
  {
    id: 'star',
    name: 'Star Bundle',
    tokens: 50,
    price: '₹99',
    priceNumeric: 99,
    badge: 'STARTER',
    desc: 'Perfect for a single birth chart + report',
  },
  {
    id: 'constellation',
    name: 'Constellation',
    tokens: 150,
    price: '₹249',
    priceNumeric: 249,
    badge: 'MOST POPULAR',
    desc: 'Allows deep chat counseling & extra recasts',
  },
  {
    id: 'galaxy',
    name: 'Galaxy Vault',
    tokens: 400,
    price: '₹599',
    priceNumeric: 599,
    badge: 'BEST VALUE',
    desc: 'Unlimited spiritual queries & chart caches',
  },
];

export const getPlanById = (id: string): TokenPlan | undefined => {
  return tokenPlans.find((plan) => plan.id === id);
};
