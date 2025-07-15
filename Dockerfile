# Builder
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# App
FROM node:lts-slim

WORKDIR /app

RUN npm install -g wrangler

COPY --from=builder /app/dist ./dist
COPY ./functions ./functions
COPY ./wrangler.jsonc .

ENV WRANGLER_SEND_METRICS=false

EXPOSE 80

CMD ["wrangler", "pages", "dev", "--port", "80", "--ip", "0.0.0.0"]
