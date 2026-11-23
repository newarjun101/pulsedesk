FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/backend/package*.json ./apps/backend/
RUN npm ci
COPY packages/shared-types ./packages/shared-types
COPY apps/backend ./apps/backend
RUN npm --workspace=packages/shared-types run build
RUN npm --workspace=apps/backend run prisma:generate
RUN npm --workspace=apps/backend run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
EXPOSE 4000
CMD ["node", "apps/backend/dist/main.js"]
