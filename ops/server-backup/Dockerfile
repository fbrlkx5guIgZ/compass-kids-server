FROM node:22-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --chown=node:node vapp ./vapp

USER node

CMD ["node", "vapp/server.js"]
