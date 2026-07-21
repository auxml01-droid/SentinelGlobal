import { RiskLevel } from '@sentinel/types';

export const RISK_THRESHOLDS = {
  [RiskLevel.NORMAL]: { min: 0, max: 20, color: '#22c55e', label: 'Normal' },
  [RiskLevel.ATENCAO]: { min: 21, max: 40, color: '#eab308', label: 'Atenção' },
  [RiskLevel.ALERTA]: { min: 41, max: 60, color: '#f97316', label: 'Alerta' },
  [RiskLevel.ALTO_RISCO]: { min: 61, max: 80, color: '#ef4444', label: 'Alto Risco' },
  [RiskLevel.CRITICO]: { min: 81, max: 95, color: '#a855f7', label: 'Crítico' },
  [RiskLevel.EMERGENCIA_MUNDIAL]: { min: 96, max: 100, color: '#000000', label: 'Emergência Mundial' },
} as const;
