# syntax=docker/dockerfile:1.6

# -------- deps --------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev=false

# -------- build --------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# -------- runtime --------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
# Next.js 15 使用 .next 下的构建产物
COPY --from=build /app/.next ./.next
COPY public ./public
EXPOSE 3001
CMD ["npm", "run", "start"]
