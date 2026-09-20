FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=10000
ENV DATA_DIR=/app/storage/data
ENV UPLOADS_DIR=/app/storage/uploads

RUN mkdir -p /app/storage/data /app/storage/uploads

EXPOSE 10000

CMD ["npm", "start"]
