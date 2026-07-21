import { RiskLevelColor } from '@sentinel/types';

interface RiskBarProps {
  score: number;
  height?: number;
  showLabel?: boolean;
}

export function RiskBar({ score, height = 8, showLabel = true }: RiskBarProps) {
  const color = getRiskColor(score);

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: '#1a1a2e', height }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="font-mono text-xs font-bold" style={{ color }}>
          {score}%
        </span>
      )}
    </div>
  );
}

function getRiskColor(score: number): string {
  if (score <= 20) return RiskLevelColor[1];
  if (score <= 40) return RiskLevelColor[2];
  if (score <= 60) return RiskLevelColor[3];
  if (score <= 80) return RiskLevelColor[4];
  if (score <= 95) return RiskLevelColor[5];
  return RiskLevelColor[6];
}
