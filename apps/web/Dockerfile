FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && npm install && npm run build --workspace=@surviv/web

FROM nginx:1.27-alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
