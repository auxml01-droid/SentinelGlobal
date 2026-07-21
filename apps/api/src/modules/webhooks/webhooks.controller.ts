import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

class CreateWebhookDto {
  url!: string;
  events!: string[];
  minRiskLevel?: number;
  countries?: string[];
  active?: boolean;
  secret?: string;
}

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post()
  create(@Body() body: CreateWebhookDto): any {
    const webhook = this.service.create({
      url: body.url,
      events: body.events || [],
      minRiskLevel: body.minRiskLevel ?? 3,
      countries: body.countries || [],
      active: body.active ?? true,
      secret: body.secret,
    });
    return { webhook, message: 'Webhook criado com sucesso' };
  }

  @Get()
  list(): any {
    return { webhooks: this.service.findAll() };
  }

  @Get(':id')
  get(@Param('id') id: string): any {
    const wh = this.service.findById(id);
    if (!wh) return { error: 'Webhook não encontrado' };
    return { webhook: wh };
  }

  @Get(':id/deliveries')
  getDeliveries(@Param('id') id: string): any {
    return { deliveries: this.service.getDeliveries(id) };
  }

  @Delete(':id')
  delete(@Param('id') id: string): any {
    const deleted = this.service.delete(id);
    return { deleted, message: deleted ? 'Webhook removido' : 'Não encontrado' };
  }
}
