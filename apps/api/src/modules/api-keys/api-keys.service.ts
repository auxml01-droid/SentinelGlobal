import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

export interface ApiKeyData {
  key: string;
  name: string;
  tier: 'free' | 'pro' | 'enterprise';
  rateLimit: number;
  createdAt: string;
  expiresAt?: string;
  active: boolean;
}

@Injectable()
export class ApiKeysService {
  private keys: Map<string, ApiKeyData> = new Map();

  constructor() {
    this.keys.set('sg_demo_public', {
      key: 'sg_demo_public',
      name: 'Demo Público',
      tier: 'free',
      rateLimit: 10,
      createdAt: new Date().toISOString(),
      active: true,
    });
  }

  generateKey(name: string, tier: ApiKeyData['tier'] = 'free'): ApiKeyData {
    const raw = randomBytes(24).toString('hex');
    const key = `sg_${tier}_${raw}`;

    const limits = { free: 10, pro: 100, enterprise: 1000 };

    const data: ApiKeyData = {
      key,
      name,
      tier,
      rateLimit: limits[tier],
      createdAt: new Date().toISOString(),
      active: true,
    };

    this.keys.set(key, data);
    return data;
  }

  validateKey(key: string): ApiKeyData | null {
    const data = this.keys.get(key);
    if (!data || !data.active) return null;

    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      return null;
    }

    return data;
  }

  revokeKey(key: string): boolean {
    const data = this.keys.get(key);
    if (!data) return false;
    data.active = false;
    return true;
  }

  listKeys(): ApiKeyData[] {
    return Array.from(this.keys.values());
  }
}
