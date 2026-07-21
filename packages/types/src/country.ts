export interface Country {
  code: string;
  name: string;
  namePtBr: string;
  continent: Continent;
  lat: number;
  lng: number;
  population: number;
  riskScore: number;
}

export enum Continent {
  AFRICA = 'Africa',
  ASIA = 'Asia',
  EUROPE = 'Europe',
  NORTH_AMERICA = 'North America',
  SOUTH_AMERICA = 'South America',
  OCEANIA = 'Oceania',
  ANTARCTICA = 'Antarctica',
}

export interface CountryEventSummary {
  countryCode: string;
  countryName: string;
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  riskScore: number;
  riskLevel: number;
}
