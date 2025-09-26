# 环境变量说明

在 `web` 目录创建 `.env.local`：

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

- 开发：后端占用 3000，前端占用 3001（见 `package.json`）。
- 生产/测试可使用 `.env.production` / `.env.staging` 替换为对应 API 地址。
