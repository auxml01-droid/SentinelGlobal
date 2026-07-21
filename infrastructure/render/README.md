# Deploy no Render

## Pré-requisitos

1. Conta no [Render](https://render.com) (plano Free ou superior)
2. Repositório no GitHub conectado ao Render
3. (Opcional) Banco PostgreSQL gerenciado pelo Render

## Serviços

| Serviço | Tipo | Porta | Plano |
|---------|------|-------|-------|
| sentinel-web | Web Service | 3000 | Free |
| sentinel-api | Web Service | 3001 | Free |
| sentinel-worker | Background Worker | - | Free |
| sentinel-redis | Redis | 6379 | Free |

## Variáveis de Ambiente

### API (sentinel-api)
- `REDIS_HOST` — preenchido automaticamente pelo Redis do Render
- `REDIS_PORT` — preenchido automaticamente
- `DATABASE_URL` — configurar manualmente se usar PostgreSQL

### Web (sentinel-web)
- `NEXT_PUBLIC_API_URL` — URL da API (ex: `https://sentinel-api.onrender.com`)
- `NEXT_PUBLIC_WS_URL` — URL do WebSocket (ex: `wss://sentinel-api.onrender.com`)

## Deploy Manual (alternativo ao Blueprint)

1. Acesse o Dashboard do Render
2. New + Web Service → conecte o repositório
3. Configure:
   - **Name**: sentinel-api
   - **Runtime**: Docker
   - **Dockerfile Path**: `./infrastructure/docker/api.Dockerfile`
   - **Context**: root do repositório
4. Repita para web e worker
5. New + Redis → sentinel-redis (Free)

## Blueprint (Infrastructure as Code)

O arquivo `render.yaml` define todos os serviços.
Basta conectar o repositório no Render > Blueprint.
