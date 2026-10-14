# Multi-stage build para Ocularis
# Etapa 1: Build con Node.js Alpine
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .
RUN npm run build

# Etapa 2: Servidor de producción ultra-ligero con Nginx Alpine (~25MB)
FROM nginx:alpine

# Reemplazar configuración por defecto de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar bundle optimizado desde builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
