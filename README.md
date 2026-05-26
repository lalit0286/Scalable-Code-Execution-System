# Code Guru — Scalable Code Execution Platform

A production-grade, secure code execution engine capable of safely running user-submitted JavaScript and Python code with concurrency control, fault isolation, Docker sandboxing, queue-based execution, and real-time updates.

Designed to scale toward **1000 concurrent users**.

---

## Architecture Summary

```
┌─────────┐    HTTP/WS    ┌──────────┐    HTTP    ┌─────────┐
│  nginx  │──────────────▶│ Next.js  │            │         │
│ :80     │               │  Web     │            │         │
└────┬────┘               └──────────┘            │         │
     │                                             │         │
     │ /api/, /socket.io/ ┌──────────┐  BullMQ   │  Redis  │
     └───────────────────▶│ Express  │◀──────────▶│         │
                          │  API     │  Pub/Sub   │         │
                          └────┬─────┘            └────┬────┘
                               │                       │
                               │ PostgreSQL             │ BullMQ
                          ┌────▼─────┐            ┌────▼────┐
                          │ Postgres │            │ Worker  │
                          │   DB     │◀───────────│ Process │
                          └──────────┘  Prisma    └────┬────┘
                                                       │
                                                  Docker spawn
                                                       │
                                              ┌────────▼────────┐
                                              │ Ephemeral        │
                                              │ Docker Container │
                                              │ (node/python)    │
                                              └─────────────────┘
```

**Request Lifecycle:**
1. User submits code via POST `/api/execute`
2. API validates, persists to PostgreSQL, enqueues BullMQ job → returns `execution_id`
3. Frontend subscribes to Socket.io room `execution:<id>`
4. Worker dequeues job, emits `running` via Redis pub/sub
5. Worker spawns isolated Docker container, captures output
6. Worker emits `completed/failed/timeout` via Redis pub/sub
7. API relays pub/sub events to Socket.io → frontend updates in real-time

---

## Setup Instructions

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 9+

### Local Development

```bash
# 1. Clone and install
git clone <repo>
cd code-execution-platform
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env as needed

# 3. Start infrastructure (Postgres + Redis)
docker compose up postgres redis -d

# 4. Run migrations
npm run db:migrate

# 5. Pull execution runtime images
docker pull node:20-alpine
docker pull python:3.11-alpine

# 6. Start all services
npm run dev
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **API Health**: http://localhost:3001/health
- **API Metrics**: http://localhost:3001/metrics

### Docker (Full Stack)

```bash
# Build and start everything
docker compose up --build

# Access at http://localhost
```

---

## Environment Variables

### API (`apps/api`)

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3001` | API server port |
| `DATABASE_URL` | — | PostgreSQL connection URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `LOG_LEVEL` | `info` | Pino log level |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | `60` | Max requests per window |
| `MAX_PAYLOAD_SIZE` | `256kb` | Max request body size |

### Worker (`apps/worker`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `WORKER_CONCURRENCY` | `10` | Max parallel executions |
| `LOG_LEVEL` | `info` | Pino log level |

### Web (`apps/web`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | API base URL (browser-visible) |

---

## API Usage

### Execute Code

```http
POST /api/execute
Content-Type: application/json

{
  "user_id": "user-123",
  "language": "javascript",
  "code": "console.log('Hello World')"
}
```

**Response (202 Accepted):**
```json
{
  "execution_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

### Get Execution Result

```http
GET /api/executions/:id
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-123",
  "language": "javascript",
  "status": "completed",
  "output": "Hello World",
  "execution_time_ms": 142,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### List User Executions

```http
GET /api/executions?user_id=user-123
```

### Health Check

```http
GET /health
```

### Metrics

```http
GET /metrics
```

### Real-Time Updates (Socket.io)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// Subscribe to an execution
socket.emit('subscribe', { execution_id: 'uuid' });

// Listen for lifecycle events
socket.on('execution:update', (payload) => {
  console.log(payload);
  // { execution_id, status, output?, stderr?, execution_time_ms? }
});
```

---

## Scaling Strategy

### Horizontal Worker Scaling

Workers are stateless — scale by running multiple worker containers:

```bash
docker compose up --scale worker=5
```

Each worker reads from the same BullMQ queue. BullMQ's distributed locking prevents double-processing.

### Redis Queue Scaling

- Redis handles the queue coordination
- For extreme scale, use Redis Cluster or Redis Sentinel
- BullMQ supports Redis Cluster natively

### API Scaling

- The API is stateless (Socket.io pub/sub via Redis ensures events route correctly)
- Scale API instances behind nginx:

```bash
docker compose up --scale api=3
```

### Handling Bursts

- `MAX_QUEUE_SIZE = 10,000` jobs provides burst buffer
- Queue backpressure returns `503` when full, preventing cascading failure
- Per-user throttle (`PER_USER_MAX_CONCURRENT = 3`) prevents single users from monopolizing workers

### Path to 1000 Concurrent Users

| Component | Strategy |
|---|---|
| nginx | Multiple upstream API + Web instances |
| API | 3–5 instances (stateless, Socket.io via Redis) |
| Worker | 10+ instances, each with concurrency 10 = 100 parallel executions |
| Redis | Redis Cluster or Sentinel for HA |
| PostgreSQL | Read replicas, connection pooling via PgBouncer |
| Docker | Pre-pulled images + container pool (advanced) |

---

## Assumptions

1. Docker daemon is accessible from the worker (Docker socket mount)
2. `node:20-alpine` and `python:3.11-alpine` images are pre-pulled on worker hosts
3. The `/tmp` directory is writable on the host for temporary code files
4. Authentication/authorization is handled upstream (user_id is trusted from request)
5. The demo uses a static `demo-user-001` user ID; production would use JWT auth
