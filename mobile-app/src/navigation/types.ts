// Navigation Types for AstroGPT / KundaliGPT

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  BirthDataForm: undefined;
  DocumentUpload: undefined;
  Forecast: { initialPeriod?: 'week' | 'month' } | undefined;
  MockCheckout: { planId: string };
  PurchaseSuccess: { planId: string; tokensCredited: number };
  PurchaseFailure: { planId: string; errorMessage: string };
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  OtpVerify: { phone: string };
};

export type MainTabParamList = {
  DashboardTab: undefined;
  CalendarTab: undefined;
  ReportTab: undefined;
  ChatTab: undefined;
  WalletTab: undefined;
  SettingsTab: undefined;
};
