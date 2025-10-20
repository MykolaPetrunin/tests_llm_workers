# Fly.io Worker

Node.js 20 воркер на TypeScript з Fastify для обробки LLM запитів.

## Технології

- **Node.js 20** — середовище виконання
- **TypeScript** — основна мова
- **Fastify** — легкий, швидкий веб-сервер
- **Zod** — типобезпечна валідація
- **OpenAI SDK** — для запитів до LLM-моделі
- **Prisma ORM + PostgreSQL** — робота з БД
- **Pino** — JSON-логер для продакшну
- **Docker** — контейнеризація

## Структура проєкту

```
/
├── prisma/
│   └── schema.prisma          # Схема БД
├── src/
│   ├── index.ts              # Основний файл сервера
│   ├── routes/
│   │   └── topics.ts         # API routes
│   └── lib/
│       └── prisma.ts         # Prisma Client
├── Dockerfile                 # Docker конфігурація
├── fly.toml                  # Fly.io конфігурація
├── package.json              # Залежності
└── tsconfig.json             # TypeScript конфігурація
```

## API Endpoints

### Health Check
```
GET /health
```

### Start Filling Topics
```
POST /api/start-filling-topics-with-data
Content-Type: application/json

{
  "bookId": "string"
}

Response:
{
  "success": true,
  "message": "Topics filling process started successfully",
  "bookId": "string",
  "jobId": "string",
  "status": "started"
}
```

### Check Fill Status
```
GET /api/fill-status/:bookId

Response:
{
  "success": true,
  "bookId": "string",
  "status": "idle|in_progress|success|failed",
  "jobId": "string",
  "startedAt": "2024-01-01T00:00:00.000Z",
  "finishedAt": "2024-01-01T00:05:00.000Z"
}
```

## Важливо про Prisma

Цей воркер використовує спільну БД з основним проєктом. Prisma Client має бути згенерований в основному проєкті та доступний через `node_modules/@prisma/client`.

## Локальна розробка

1. Встановити залежності:
```bash
npm install
```

2. Налаштувати змінні середовища:
```bash
cp env.example .env
# Відредагувати .env файл
```

3. Запустити в режимі розробки:
```bash
npm run dev
```

5. Збудувати проєкт:
```bash
npm run build
```

## Деплой на Fly.io

1. Встановити Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Авторизуватися:
```bash
fly auth login
```

3. Створити додаток:
```bash
fly launch
```

4. Налаштувати змінні середовища:
```bash
fly secrets set DATABASE_URL="your_database_url"
fly secrets set OPENAI_API_KEY="your_openai_key"
```

5. Деплой:
```bash
fly deploy
```

## Змінні середовища

- `DATABASE_URL` — URL підключення до PostgreSQL
- `NODE_ENV` — середовище (development/production)
- `PORT` — порт сервера (за замовчуванням 3001)
- `HOST` — хост сервера (за замовчуванням 0.0.0.0)
- `LOG_LEVEL` — рівень логування (info/debug/error)
- `OPENAI_API_KEY` — API ключ OpenAI

## Команди

- `npm run dev` — запуск в режимі розробки
- `npm run build` — збірка проєкту
- `npm start` — запуск продакшн версії
