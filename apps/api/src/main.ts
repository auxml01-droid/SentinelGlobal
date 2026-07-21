import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import * as openApiDoc from './openapi.json';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  app.enableCors({
    origin: ['http://localhost:3000', 'https://sentinelglobal.io'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/public/docs', (_req: any, res: any) => {
    res.type('application/json').send(openApiDoc);
  });
  httpAdapter.get('/public/docs/swagger', (_req: any, res: any) => {
    const html = `<!DOCTYPE html>
<html><head><title>SentinelGlobal API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body><div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/public/docs', dom_id: '#swagger-ui' })</script>
</body></html>`;
    res.type('text/html').send(html);
  });

  await app.listen(3001, '0.0.0.0');
  console.log(`🔭 SentinelGlobal API rodando em http://localhost:3001`);
  console.log(`📖 Documentação: http://localhost:3001/public/docs/swagger`);
}

bootstrap();
