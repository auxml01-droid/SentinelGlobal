import { Controller, Post, Delete, Get, Body, Param } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

class CreateKeyDto {
  name!: string;
  tier?: 'free' | 'pro' | 'enterprise';
}

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  @Post()
  create(@Body() body: CreateKeyDto): any {
    const key = this.service.generateKey(body.name, body.tier);
    return { key, message: 'Chave criada. Guarde-a com segurança.' };
  }

  @Get()
  list(): any {
    return { keys: this.service.listKeys() };
  }

  @Delete(':key')
  revoke(@Param('key') key: string) {
    const revoked = this.service.revokeKey(key);
    return { revoked, message: revoked ? 'Chave revogada' : 'Chave não encontrada' };
  }
}
