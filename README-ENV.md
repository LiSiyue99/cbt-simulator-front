# 环境变量说明

在 `web` 目录创建 `.env.local`：

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

- 开发：后端占用 3000，前端占用 3001（见 `package.json`）。
- 生产/测试可使用 `.env.production` / `.env.staging` 替换为对应 API 地址。

## 样例
- `.env.production`
```
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```
- `.env.staging`
```
NEXT_PUBLIC_API_BASE_URL=https://staging-api.example.com
```

注意：`NEXT_PUBLIC_*` 前缀的变量会在浏览器可见，请勿放置敏感信息。
