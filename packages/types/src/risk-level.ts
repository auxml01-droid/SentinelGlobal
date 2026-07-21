export enum RiskLevel {
  NORMAL = 1,
  ATENCAO = 2,
  ALERTA = 3,
  ALTO_RISCO = 4,
  CRITICO = 5,
  EMERGENCIA_MUNDIAL = 6,
}

export const RiskLevelLabel: Record<RiskLevel, string> = {
  [RiskLevel.NORMAL]: 'Normal',
  [RiskLevel.ATENCAO]: 'Atenção',
  [RiskLevel.ALERTA]: 'Alerta',
  [RiskLevel.ALTO_RISCO]: 'Alto Risco',
  [RiskLevel.CRITICO]: 'Crítico',
  [RiskLevel.EMERGENCIA_MUNDIAL]: 'Emergência Mundial',
};

export const RiskLevelColor: Record<RiskLevel, string> = {
  [RiskLevel.NORMAL]: '#22c55e',
  [RiskLevel.ATENCAO]: '#eab308',
  [RiskLevel.ALERTA]: '#f97316',
  [RiskLevel.ALTO_RISCO]: '#ef4444',
  [RiskLevel.CRITICO]: '#a855f7',
  [RiskLevel.EMERGENCIA_MUNDIAL]: '#000000',
};

export const RiskLevelEmoji: Record<RiskLevel, string> = {
  [RiskLevel.NORMAL]: '🟢',
  [RiskLevel.ATENCAO]: '🟡',
  [RiskLevel.ALERTA]: '🟠',
  [RiskLevel.ALTO_RISCO]: '🔴',
  [RiskLevel.CRITICO]: '🟣',
  [RiskLevel.EMERGENCIA_MUNDIAL]: '⚫',
};

export interface GlobalRiskScore {
  globalScore: number;
  level: RiskLevel;
  countries: CountryRiskScore[];
  updatedAt: string;
}

export interface CountryRiskScore {
  countryCode: string;
  countryName: string;
  score: number;
  level: RiskLevel;
  trend: 'up' | 'down' | 'stable';
  topEvents: string[];
}
