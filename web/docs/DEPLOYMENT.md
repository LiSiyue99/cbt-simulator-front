# 前端部署手册（cbt-simulator-front/web）

## 环境准备
- Node 20 LTS / npm@10（或 Docker）
- 环境变量：`NEXT_PUBLIC_API_BASE_URL`（详见项目根 `README-ENV.md`）

## 非容器（推荐与后端同机部署时）
```bash
npm ci --omit=dev=false
npm run build
npm run start # 3001
```

## Docker（推荐）
```bash
docker build -t cbt-frontend:latest .
docker run -d --name cbt-web -p 3001:3001 --env-file .env.production cbt-frontend:latest
```

## 反向代理（示例）
```nginx
server {
  listen 80;
  server_name web.example.com;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## 联调注意
- API 地址需与后端生产域名一致，如 `https://api.example.com`
- 本地开发：后端 3000，前端 3001
- 健康检查：前端无需 `/health`；可通过反代探测首页 200
