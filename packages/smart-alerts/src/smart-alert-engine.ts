import { GlobalEvent, EventCategory, EventSubType, RiskLevel, GeoPoint } from '@sentinel/types';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'expired';
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'between';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  conditions: AlertCondition[];
  logic: 'AND' | 'OR';
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
  caseSensitive?: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  eventId: string;
  eventTitle: string;
  message: string;
  metadata: Record<string, unknown>;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AlertFilter {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  categories?: EventCategory[];
  subTypes?: EventSubType[];
  riskScoreMin?: number;
  riskScoreMax?: number;
  location?: {
    center: GeoPoint;
    radiusKm: number;
  };
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'critical-earthquake',
    name: 'Terremoto Crítico',
    description: 'Alerta para terremotos acima de M7.0',
    severity: 'critical',
    conditions: [
      { field: 'subType', operator: 'eq', value: EventSubType.EARTHQUAKE },
      { field: 'impact.magnitude', operator: 'gte', value: 7.0 },
    ],
    logic: 'AND',
    enabled: true,
    cooldownMinutes: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'high-risk-event',
    name: 'Evento de Alto Risco',
    description: 'Alerta para eventos com risco >= 80',
    severity: 'high',
    conditions: [
      { field: 'riskScore', operator: 'gte', value: 80 },
    ],
    logic: 'AND',
    enabled: true,
    cooldownMinutes: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tsunami-warning',
    name: 'Alerta de Tsunami',
    description: 'Alerta para qualquer evento de tsunami',
    severity: 'critical',
    conditions: [
      { field: 'subType', operator: 'eq', value: EventSubType.TSUNAMI },
    ],
    logic: 'AND',
    enabled: true,
    cooldownMinutes: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wildfire-spread',
    name: 'Incêndio Florestal Ativo',
    description: 'Alerta para incêndios florestais',
    severity: 'medium',
    conditions: [
      { field: 'subType', operator: 'eq', value: EventSubType.WILDFIRE },
      { field: 'riskScore', operator: 'gte', value: 50 },
    ],
    logic: 'AND',
    enabled: true,
    cooldownMinutes: 45,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'conflict-escalation',
    name: 'Escalada de Conflito',
    description: 'Alerta para conflitos com vítimas fatais',
    severity: 'high',
    conditions: [
      { field: 'category', operator: 'eq', value: EventCategory.CONFLICT },
      { field: 'impact.fatalities', operator: 'gt', value: 0 },
    ],
    logic: 'AND',
    enabled: true,
    cooldownMinutes: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pandemic-alert',
    name: 'Alerta de Pandemia',
    description: 'Alerta para surtos e pandemias',
    severity: 'critical',
    conditions: [
      { field: 'subType', operator: 'in', value: [EventSubType.PANDEMIC, EventSubType.EPIDEMIC] },
    ],
    logic: 'OR',
    enabled: true,
    cooldownMinutes: 120,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class SmartAlertEngine {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private maxHistory = 500;

  constructor() {
    for (const rule of DEFAULT_RULES) {
      this.rules.set(rule.id, rule);
    }
  }

  processEvent(event: GlobalEvent): Alert[] {
    const newAlerts: Alert[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        const lastTriggered = new Date(rule.lastTriggered).getTime();
        if (Date.now() - lastTriggered < cooldownMs) continue;
      }

      if (this.evaluateRule(rule, event)) {
        const alert = this.createAlert(rule, event);
        this.alerts.set(alert.id, alert);
        this.alertHistory.push(alert);
        newAlerts.push(alert);

        rule.lastTriggered = new Date().toISOString();
        this.rules.set(rule.id, rule);
      }
    }

    if (this.alertHistory.length > this.maxHistory) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistory);
    }

    return newAlerts;
  }

  private evaluateRule(rule: AlertRule, event: GlobalEvent): boolean {
    const results = rule.conditions.map((condition) =>
      this.evaluateCondition(condition, event)
    );

    if (rule.logic === 'AND') {
      return results.every((r) => r);
    } else {
      return results.some((r) => r);
    }
  }

  private evaluateCondition(condition: AlertCondition, event: GlobalEvent): boolean {
    const fieldValue = this.getFieldValue(event, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'eq':
        return condition.caseSensitive
          ? fieldValue === conditionValue
          : String(fieldValue).toLowerCase() === String(conditionValue).toLowerCase();
      case 'neq':
        return condition.caseSensitive
          ? fieldValue !== conditionValue
          : String(fieldValue).toLowerCase() !== String(conditionValue).toLowerCase();
      case 'gt':
        return Number(fieldValue) > Number(conditionValue);
      case 'gte':
        return Number(fieldValue) >= Number(conditionValue);
      case 'lt':
        return Number(fieldValue) < Number(conditionValue);
      case 'lte':
        return Number(fieldValue) <= Number(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'nin':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'between':
        if (Array.isArray(conditionValue) && conditionValue.length === 2) {
          const num = Number(fieldValue);
          return num >= conditionValue[0] && num <= conditionValue[1];
        }
        return false;
      default:
        return false;
    }
  }

  private getFieldValue(event: GlobalEvent, field: string): unknown {
    const parts = field.split('.');
    let current: unknown = event;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private createAlert(rule: AlertRule, event: GlobalEvent): Alert {
    const message = this.generateAlertMessage(rule, event);

    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: 'active',
      eventId: event.id,
      eventTitle: event.title,
      message,
      metadata: {
        eventCategory: event.category,
        eventSubType: event.subType,
        riskScore: event.riskScore,
        location: event.location,
        countryCode: event.countryCode,
      },
      createdAt: new Date().toISOString(),
    };
  }

  private generateAlertMessage(rule: AlertRule, event: GlobalEvent): string {
    const severityLabel = {
      critical: 'CRÍTICO',
      high: 'ALTO',
      medium: 'MÉDIO',
      low: 'BAIXO',
      info: 'INFO',
    }[rule.severity];

    let message = `[${severityLabel}] ${rule.name}: ${event.title}`;

    if (event.riskScore) {
      message += ` (Risco: ${event.riskScore}/100)`;
    }

    if (event.locationName) {
      message += ` em ${event.locationName}`;
    }

    if (event.impact?.magnitude) {
      message += ` — Magnitude ${event.impact.magnitude.toFixed(1)}`;
    }

    if (event.impact?.fatalities) {
      message += ` — ${event.impact.fatalities} vítimas fatais`;
    }

    return message;
  }

  filterEvents(events: GlobalEvent[], filter: AlertFilter): GlobalEvent[] {
    return events.filter((event) => {
      if (filter.severity && filter.severity.length > 0) {
        const alertSeverity = this.eventToSeverity(event);
        if (!filter.severity.includes(alertSeverity)) return false;
      }

      if (filter.status && filter.status.length > 0) {
        if (!filter.status.includes(event.status as AlertStatus)) return false;
      }

      if (filter.categories && filter.categories.length > 0) {
        if (!filter.categories.includes(event.category)) return false;
      }

      if (filter.subTypes && filter.subTypes.length > 0) {
        if (!filter.subTypes.includes(event.subType)) return false;
      }

      if (filter.riskScoreMin !== undefined && event.riskScore < filter.riskScoreMin) {
        return false;
      }

      if (filter.riskScoreMax !== undefined && event.riskScore > filter.riskScoreMax) {
        return false;
      }

      if (filter.location) {
        const distance = this.haversineDistance(event.location, filter.location.center);
        if (distance > filter.location.radiusKm) return false;
      }

      if (filter.dateFrom) {
        if (new Date(event.timestamp) < new Date(filter.dateFrom)) return false;
      }

      if (filter.dateTo) {
        if (new Date(event.timestamp) > new Date(filter.dateTo)) return false;
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(searchLower);
        const matchesDescription = event.description?.toLowerCase().includes(searchLower);
        const matchesLocation = event.locationName?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDescription && !matchesLocation) return false;
      }

      return true;
    });
  }

  private eventToSeverity(event: GlobalEvent): AlertSeverity {
    if (event.riskScore >= 80) return 'critical';
    if (event.riskScore >= 60) return 'high';
    if (event.riskScore >= 40) return 'medium';
    if (event.riskScore >= 20) return 'low';
    return 'info';
  }

  private haversineDistance(a: GeoPoint, b: GeoPoint): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }

  acknowledgeAlert(alertId: string, userId: string): Alert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date().toISOString();
    this.alerts.set(alertId, alert);

    return alert;
  }

  resolveAlert(alertId: string): Alert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    this.alerts.set(alertId, alert);

    return alert;
  }

  addRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.rules.set(newRule.id, newRule);
    return newRule;
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): AlertRule | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    const updatedRule = {
      ...rule,
      ...updates,
      id: rule.id,
      createdAt: rule.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.rules.set(ruleId, updatedRule);
    return updatedRule;
  }

  deleteRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((a) => a.status === 'active');
  }

  getAlerts(filter?: { severity?: AlertSeverity[]; status?: AlertStatus[] }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (filter?.severity) {
      alerts = alerts.filter((a) => filter.severity!.includes(a.severity));
    }

    if (filter?.status) {
      alerts = alerts.filter((a) => filter.status!.includes(a.status));
    }

    return alerts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getAlertHistory(): Alert[] {
    return [...this.alertHistory];
  }

  getStats(): {
    totalAlerts: number;
    activeAlerts: number;
    bySeverity: Record<AlertSeverity, number>;
    byStatus: Record<AlertStatus, number>;
    totalRules: number;
    activeRules: number;
  } {
    const alerts = Array.from(this.alerts.values());
    const bySeverity: Record<AlertSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    const byStatus: Record<AlertStatus, number> = {
      active: 0,
      acknowledged: 0,
      resolved: 0,
      expired: 0,
    };

    for (const alert of alerts) {
      bySeverity[alert.severity]++;
      byStatus[alert.status]++;
    }

    const rules = Array.from(this.rules.values());

    return {
      totalAlerts: alerts.length,
      activeAlerts: byStatus.active,
      bySeverity,
      byStatus,
      totalRules: rules.length,
      activeRules: rules.filter((r) => r.enabled).length,
    };
  }

  clear(): void {
    this.alerts.clear();
    this.alertHistory = [];
  }
}
