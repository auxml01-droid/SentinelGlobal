import { GlobalEvent, EventCategory, GeoPoint } from '@sentinel/types';

export type EntityType = 'country' | 'city' | 'event' | 'infrastructure' | 'risk_zone';

export type RelationType =
  | 'located_in'
  | 'affects'
  | 'near'
  | 'caused_by'
  | 'related_to'
  | 'part_of'
  | 'borders'
  | 'infrastructure_of';

export interface GraphEntity {
  id: string;
  type: EntityType;
  name: string;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphRelation {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  weight: number;
  properties: Record<string, unknown>;
  createdAt: string;
}

export interface GraphPath {
  entities: GraphEntity[];
  relations: GraphRelation[];
  totalWeight: number;
}

export interface RiskPropagation {
  entityId: string;
  entityName: string;
  propagatedRisk: number;
  path: string[];
  depth: number;
}

const COUNTRY_DATA: Array<{
  code: string;
  name: string;
  lat: number;
  lng: number;
  population: number;
  region: string;
}> = [
  { code: 'BR', name: 'Brasil', lat: -14.23, lng: -51.92, population: 214000000, region: 'Américas' },
  { code: 'US', name: 'Estados Unidos', lat: 37.09, lng: -95.71, population: 331000000, region: 'Américas' },
  { code: 'CN', name: 'China', lat: 35.86, lng: 104.19, population: 1400000000, region: 'Ásia' },
  { code: 'IN', name: 'Índia', lat: 20.59, lng: 78.96, population: 1380000000, region: 'Ásia' },
  { code: 'JP', name: 'Japão', lat: 36.2, lng: 138.25, population: 125000000, region: 'Ásia' },
  { code: 'DE', name: 'Alemanha', lat: 51.16, lng: 10.45, population: 83000000, region: 'Europa' },
  { code: 'GB', name: 'Reino Unido', lat: 55.37, lng: -3.43, population: 67000000, region: 'Europa' },
  { code: 'FR', name: 'França', lat: 46.22, lng: 2.21, population: 67000000, region: 'Europa' },
  { code: 'RU', name: 'Rússia', lat: 61.52, lng: 105.31, population: 144000000, region: 'Europa/Ásia' },
  { code: 'AU', name: 'Austrália', lat: -25.27, lng: 133.77, population: 25000000, region: 'Oceania' },
  { code: 'IL', name: 'Israel', lat: 31.04, lng: 34.85, population: 9000000, region: 'Oriente Médio' },
  { code: 'UA', name: 'Ucrânia', lat: 48.37, lng: 31.16, population: 44000000, region: 'Europa' },
  { code: 'TR', name: 'Turquia', lat: 38.96, lng: 35.24, population: 84000000, region: 'Europa/Ásia' },
  { code: 'IR', name: 'Irã', lat: 32.42, lng: 53.68, population: 84000000, region: 'Oriente Médio' },
  { code: 'ID', name: 'Indonésia', lat: -0.78, lng: 113.92, population: 273000000, region: 'Ásia' },
];

export class KnowledgeGraph {
  private entities: Map<string, GraphEntity> = new Map();
  private relations: Map<string, GraphRelation> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeCountries();
  }

  private initializeCountries(): void {
    for (const country of COUNTRY_DATA) {
      const entity: GraphEntity = {
        id: `country-${country.code}`,
        type: 'country',
        name: country.name,
        properties: {
          code: country.code,
          population: country.population,
          region: country.region,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.addEntity(entity);
    }
  }

  addEntity(entity: GraphEntity): void {
    this.entities.set(entity.id, entity);
    if (!this.adjacencyList.has(entity.id)) {
      this.adjacencyList.set(entity.id, new Set());
    }
  }

  addRelation(relation: GraphRelation): void {
    this.relations.set(relation.id, relation);

    if (!this.adjacencyList.has(relation.from)) {
      this.adjacencyList.set(relation.from, new Set());
    }
    if (!this.adjacencyList.has(relation.to)) {
      this.adjacencyList.set(relation.to, new Set());
    }

    this.adjacencyList.get(relation.from)!.add(relation.id);
    this.adjacencyList.get(relation.to)!.add(relation.id);
  }

  addEvent(event: GlobalEvent): void {
    const eventEntity: GraphEntity = {
      id: `event-${event.id}`,
      type: 'event',
      name: event.title,
      properties: {
        category: event.category,
        subType: event.subType,
        riskScore: event.riskScore,
        riskLevel: event.riskLevel,
        timestamp: event.timestamp,
        source: event.source,
        location: event.location,
      },
      createdAt: event.timestamp,
      updatedAt: event.updatedAt,
    };
    this.addEntity(eventEntity);

    const countryCode = event.countryCode || this.getCountryCode(event.location);
    if (countryCode) {
      const countryEntityId = `country-${countryCode}`;
      if (this.entities.has(countryEntityId)) {
        this.addRelation({
          id: `rel-event-country-${event.id}`,
          from: eventEntity.id,
          to: countryEntityId,
          type: 'located_in',
          weight: 1,
          properties: {},
          createdAt: event.timestamp,
        });
      }
    }

    const cityId = this.findNearestCity(event.location);
    if (cityId) {
      this.addRelation({
        id: `rel-event-city-${event.id}`,
        from: eventEntity.id,
        to: cityId,
        type: 'located_in',
        weight: 0.8,
        properties: {},
        createdAt: event.timestamp,
      });
    }
  }

  private getCountryCode(location: GeoPoint): string | null {
    let closest = null;
    let minDistance = Infinity;

    for (const country of COUNTRY_DATA) {
      const distance = this.haversineDistance(location, { lat: country.lat, lng: country.lng });
      if (distance < minDistance && distance < 1000) {
        minDistance = distance;
        closest = country.code;
      }
    }

    return closest;
  }

  private findNearestCity(location: GeoPoint): string | null {
    let nearest = null;
    let minDistance = Infinity;

    for (const [id, entity] of this.entities) {
      if (entity.type === 'city') {
        const entityLocation = entity.properties.location as GeoPoint;
        const distance = this.haversineDistance(location, entityLocation);
        if (distance < minDistance && distance < 100) {
          minDistance = distance;
          nearest = id;
        }
      }
    }

    return nearest;
  }

  getNeighbors(entityId: string): GraphEntity[] {
    const neighborIds = this.adjacencyList.get(entityId);
    if (!neighborIds) return [];

    const neighbors: GraphEntity[] = [];
    for (const relId of neighborIds) {
      const relation = this.relations.get(relId);
      if (relation) {
        const neighborId = relation.from === entityId ? relation.to : relation.from;
        const neighbor = this.entities.get(neighborId);
        if (neighbor) {
          neighbors.push(neighbor);
        }
      }
    }

    return neighbors;
  }

  getRelations(entityId: string): GraphRelation[] {
    const relIds = this.adjacencyList.get(entityId);
    if (!relIds) return [];

    return Array.from(relIds)
      .map((id) => this.relations.get(id))
      .filter((r): r is GraphRelation => r !== undefined);
  }

  findPath(fromId: string, toId: string, maxDepth: number = 5): GraphPath | null {
    const visited = new Set<string>();
    const queue: Array<{ entityId: string; path: GraphPath }> = [];

    queue.push({
      entityId: fromId,
      path: {
        entities: [this.entities.get(fromId)!],
        relations: [],
        totalWeight: 0,
      },
    });
    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.entityId === toId) {
        return current.path;
      }

      if (current.path.entities.length >= maxDepth) {
        continue;
      }

      const neighbors = this.getNeighbors(current.entityId);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          const relation = this.getRelations(current.entityId).find(
            (r) => r.from === neighbor.id || r.to === neighbor.id
          );

          if (relation) {
            queue.push({
              entityId: neighbor.id,
              path: {
                entities: [...current.path.entities, neighbor],
                relations: [...current.path.relations, relation],
                totalWeight: current.path.totalWeight + relation.weight,
              },
            });
          }
        }
      }
    }

    return null;
  }

  propagateRisk(entityId: string, initialRisk: number, maxDepth: number = 3): RiskPropagation[] {
    const propagations: RiskPropagation[] = [];
    const visited = new Set<string>();
    const queue: Array<{ entityId: string; risk: number; path: string[]; depth: number }> = [];

    queue.push({ entityId, risk: initialRisk, path: [entityId], depth: 0 });
    visited.add(entityId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth > 0) {
        const entity = this.entities.get(current.entityId);
        if (entity) {
          propagations.push({
            entityId: current.entityId,
            entityName: entity.name,
            propagatedRisk: current.risk,
            path: current.path,
            depth: current.depth,
          });
        }
      }

      if (current.depth < maxDepth) {
        const neighbors = this.getNeighbors(current.entityId);
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.id)) {
            visited.add(neighbor.id);
            const decayRate = 0.7;
            const newRisk = current.risk * decayRate;

            if (newRisk > 10) {
              queue.push({
                entityId: neighbor.id,
                risk: newRisk,
                path: [...current.path, neighbor.id],
                depth: current.depth + 1,
              });
            }
          }
        }
      }
    }

    return propagations;
  }

  getEntity(entityId: string): GraphEntity | undefined {
    return this.entities.get(entityId);
  }

  getEntitiesByType(type: EntityType): GraphEntity[] {
    return Array.from(this.entities.values()).filter((e) => e.type === type);
  }

  getStats(): {
    totalEntities: number;
    totalRelations: number;
    byType: Record<EntityType, number>;
    avgRelationsPerEntity: number;
  } {
    const byType: Record<EntityType, number> = {
      country: 0,
      city: 0,
      event: 0,
      infrastructure: 0,
      risk_zone: 0,
    };

    for (const entity of this.entities.values()) {
      byType[entity.type]++;
    }

    return {
      totalEntities: this.entities.size,
      totalRelations: this.relations.size,
      byType,
      avgRelationsPerEntity: this.entities.size > 0 ? (this.relations.size * 2) / this.entities.size : 0,
    };
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

  clear(): void {
    this.entities.clear();
    this.relations.clear();
    this.adjacencyList.clear();
    this.initializeCountries();
  }
}
