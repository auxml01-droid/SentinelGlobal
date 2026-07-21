import { RiskLevel, RiskLevelColor, RiskLevelLabel } from '@sentinel/types';

export function getRiskColor(score: number): string {
  if (score <= 20) return RiskLevelColor[RiskLevel.NORMAL];
  if (score <= 40) return RiskLevelColor[RiskLevel.ATENCAO];
  if (score <= 60) return RiskLevelColor[RiskLevel.ALERTA];
  if (score <= 80) return RiskLevelColor[RiskLevel.ALTO_RISCO];
  if (score <= 95) return RiskLevelColor[RiskLevel.CRITICO];
  return RiskLevelColor[RiskLevel.EMERGENCIA_MUNDIAL];
}

export function getRiskLabel(score: number): string {
  if (score <= 20) return RiskLevelLabel[RiskLevel.NORMAL];
  if (score <= 40) return RiskLevelLabel[RiskLevel.ATENCAO];
  if (score <= 60) return RiskLevelLabel[RiskLevel.ALERTA];
  if (score <= 80) return RiskLevelLabel[RiskLevel.ALTO_RISCO];
  if (score <= 95) return RiskLevelLabel[RiskLevel.CRITICO];
  return RiskLevelLabel[RiskLevel.EMERGENCIA_MUNDIAL];
}

export function getRiskEmoji(score: number): string {
  if (score <= 20) return '🟢';
  if (score <= 40) return '🟡';
  if (score <= 60) return '🟠';
  if (score <= 80) return '🔴';
  if (score <= 95) return '🟣';
  return '⚫';
}

export function formatNumber(num: number): string {
  return num.toLocaleString('pt-BR');
}

export function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes}min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;

  return new Date(timestamp).toLocaleDateString('pt-BR');
}
