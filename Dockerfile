# Fase 1
FROM node:18 AS builder

WORKDIR /app

COPY ./package*.json /app/

RUN npm install

COPY ./src /app/src
COPY ./tsconfig*.json /app/
COPY ./angular.json /app/

RUN npm run build

# Fase 2
FROM nginx:alpine

# RUN apk add --no-cache nodejs npm && \
#     npm install -g pm2

RUN apk add --no-cache nodejs npm

WORKDIR /app

COPY ./nginx.conf /etc/nginx/conf.d/default.conf

COPY ./api/index.js /app/
COPY ./api/package*.json /app/
RUN npm install

COPY --from=builder /app/dist /var/www/html

CMD ["/bin/sh", "-c", "nginx -s reload || nginx && npm start"]

EXPOSE 80
