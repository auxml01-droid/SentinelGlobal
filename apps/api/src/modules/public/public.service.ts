import { Injectable } from '@nestjs/common';
import { GlobalEvent, GlobalRiskScore } from '@sentinel/types';

interface PublicSummary {
  globalScore: number;
  globalLevel: number;
  totalEvents: number;
  activeEvents: number;
  countriesMonitored: number;
  topRisks: Array<{ country: string; score: number }>;
  lastUpdated: string;
  version: string;
}

@Injectable()
export class PublicService {
  getSummary(): PublicSummary {
    return {
      globalScore: 0,
      globalLevel: 1,
      totalEvents: 0,
      activeEvents: 0,
      countriesMonitored: 0,
      topRisks: [],
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  formatEventForPublic(event: GlobalEvent) {
    return {
      id: event.id,
      title: event.title,
      category: event.category,
      subType: event.subType,
      location: event.location,
      locationName: event.locationName,
      countryCode: event.countryCode,
      riskScore: event.riskScore,
      riskLevel: event.riskLevel,
      timestamp: event.timestamp,
      impact: {
        magnitude: event.impact?.magnitude,
        fatalities: event.impact?.fatalities,
      },
    };
  }

  formatScoreForPublic(score: GlobalRiskScore) {
    return {
      globalScore: score.globalScore,
      globalLevel: score.level,
      countriesCount: score.countries.length,
      updatedAt: score.updatedAt,
    };
  }
}
