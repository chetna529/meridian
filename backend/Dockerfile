FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN apk add --no-cache netcat-openbsd

COPY . .
RUN npx prisma generate

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 5000
CMD ["docker-entrypoint.sh"]
