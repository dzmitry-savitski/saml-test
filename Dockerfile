# Builder
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

RUN npm run build

# App
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist ./
COPY --from=builder /app/functions ./
COPY --from=builder /app/public ./

ENV WRANGLER_SEND_METRICS=false

EXPOSE 80

CMD ["npx", "wrangler", "pages", "dev", "--port", "80"]
