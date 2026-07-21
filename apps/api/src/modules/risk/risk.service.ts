import { Injectable } from '@nestjs/common';
import { GlobalRiskScore, CountryRiskScore, RiskLevel } from '@sentinel/types';
import { calculateGlobalRiskScore, scoreToRiskLevel } from '@sentinel/shared';

@Injectable()
export class RiskService {
  private countryScores: Map<string, number> = new Map();

  updateCountryScore(countryCode: string, score: number): void {
    this.countryScores.set(countryCode, score);
  }

  getGlobalScore(): GlobalRiskScore {
    const scores = Array.from(this.countryScores.values());
    const globalScore = calculateGlobalRiskScore(scores);
    const level = scoreToRiskLevel(globalScore);

    const countries: CountryRiskScore[] = Array.from(this.countryScores.entries()).map(
      ([countryCode, score]) => ({
        countryCode,
        countryName: countryCode,
        score,
        level: scoreToRiskLevel(score),
        trend: 'stable' as const,
        topEvents: [],
      }),
    );

    return {
      globalScore,
      level,
      countries,
      updatedAt: new Date().toISOString(),
    };
  }

  getCountryScore(countryCode: string): { score: number; level: RiskLevel } | null {
    const score = this.countryScores.get(countryCode);
    if (score === undefined) return null;
    return { score, level: scoreToRiskLevel(score) };
  }
}
