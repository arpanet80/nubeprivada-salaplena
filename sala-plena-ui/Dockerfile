# ============================================================
# Dockerfile - Sala Plena UI (Angular 17+)
# Multi-stage: Build Angular → Serve con Nginx
# ============================================================

# ── STAGE 1: Build Angular ──
FROM node:20-alpine AS builder

LABEL maintainer="TED Potosi <sala.plena@oep.org.bo>"
LABEL stage="builder"

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copiar código fuente
COPY . .

# Copiar env.js de producción (se sobreescribe en CI/CD si es necesario)
COPY env.js src/assets/env.js 2>/dev/null || true

# Build de producción
RUN npm run build -- --configuration production

# ── STAGE 2: Nginx Runtime ──
FROM nginx:1.25-alpine AS runtime

LABEL maintainer="TED Potosi <sala.plena@oep.org.bo>"
LABEL version="2.0"
LABEL description="Sala Plena UI - Angular + Nginx"

# Instalar utilidades
RUN apk add --no-cache     curl     wget     tzdata     && rm -rf /var/cache/apk/*

# ── Zona horaria fija del sistema (Bolivia) ──
# Afecta principalmente los timestamps en los logs de acceso de nginx.
ENV TZ=America/La_Paz
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build de Angular desde builder
COPY --from=builder /app/dist/sala-plena-ui/browser /usr/share/nginx/html

# Copiar script de entrypoint para env.js dinámico
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Puerto expuesto
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3     CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

# Entrypoint para inyectar env.js dinámico
ENTRYPOINT ["/docker-entrypoint.sh"]

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]

# Fin de stage