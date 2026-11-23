FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/frontend/package*.json ./apps/frontend/
RUN npm ci
COPY packages/shared-types ./packages/shared-types
COPY apps/frontend ./apps/frontend
RUN npm --workspace=packages/shared-types run build
RUN npm --workspace=apps/frontend run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/package.json ./apps/frontend/package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "--workspace=apps/frontend", "run", "start"]
