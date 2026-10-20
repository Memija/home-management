export const WATER_CATEGORY_COLORS: Readonly<Record<string, string>> = {
  kitchenWarm: '#ff6384',
  kitchenCold: '#36a2eb',
  bathroomWarm: '#ff9f40',
  bathroomCold: '#4bc0c0',
  kitchenTotal: '#17a2b8',
  bathroomTotal: '#6c757d',
  warmTotal: '#ffc107',
  coldTotal: '#6c757d',
};

export interface PredictionThemeColor {
  readonly primary: string;
  readonly fill: string;
}

export const PAST_FORECAST_COLOR = '#9333ea';

export const PREDICTION_THEME_COLORS: Record<
  'water' | 'electricity' | 'heating' | 'home',
  PredictionThemeColor
> = {
  water: {
    primary: '#1976d2',
    fill: 'rgba(25, 118, 210, 0.08)',
  },
  electricity: {
    primary: '#ffc107',
    fill: 'rgba(255, 193, 7, 0.08)',
  },
  heating: {
    primary: '#f57c00',
    fill: 'rgba(245, 124, 0, 0.08)',
  },
  home: {
    primary: '#1976d2',
    fill: 'rgba(25, 118, 210, 0.08)',
  },
};
