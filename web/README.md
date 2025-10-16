This is a [Next.js](https://nextjs.org) project.

## Getting Started

```bash
npm run dev
```
- App: http://localhost:3001
- API base (dev): http://localhost:3000 (configure via `NEXT_PUBLIC_API_BASE_URL`)

## Build & Run (Production)
- Non-container
```bash
npm run build
npm run start # port 3001
```
- Docker
```bash
docker build -t cbt-frontend:latest .
docker run -d --name cbt-web -p 3001:3001 --env-file .env.production cbt-frontend:latest
```

## Environment
See `../README-ENV.md`.
