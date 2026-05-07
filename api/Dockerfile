FROM node:18-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY *.js ./
COPY .env.example .env.example

RUN addgroup -g 1001 -S nodejs \
  && adduser -S txtshare -u 1001 \
  && chown -R txtshare:nodejs /app

USER txtshare

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
