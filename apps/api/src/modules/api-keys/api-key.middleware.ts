import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(private readonly service: ApiKeysService) {}

  use(req: any, _res: any, next: () => void): void {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key é obrigatória (header X-API-Key)');
    }

    const keyData = this.service.validateKey(apiKey);
    if (!keyData) {
      throw new UnauthorizedException('API key inválida ou expirada');
    }

    (req as any).apiKeyData = keyData;
    next();
  }
}
