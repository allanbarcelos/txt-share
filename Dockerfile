# Fase 1
FROM node:20-alpine AS builder

WORKDIR /app

COPY ./app/package*.json ./

RUN npm ci

COPY ./app/ ./

RUN npm run build -- --configuration production

# Fase 2
FROM nginx:alpine

COPY ./nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
