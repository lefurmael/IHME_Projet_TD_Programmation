FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
ARG BASE_PATH=/
RUN npm run build -- --base="${BASE_PATH}"

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
	&& npm cache clean --force
COPY --chown=node:node server ./server
COPY --chown=node:node data/exercices.json ./data/exercices.json
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "server/index.js"]