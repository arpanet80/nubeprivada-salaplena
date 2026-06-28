# ============================================================
# Dockerfile - Sala Plena API (NestJS)
# Base: node:20-slim (Debian 12 Bookworm)
# ============================================================

# ============================================================
# STAGE 1: Builder
# ============================================================
FROM node:20-slim AS builder

# python3, make, g++: requeridos por bcrypt y módulos nativos
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── CRÍTICO: Evitar descargas de Chromium durante npm install ──
# PUPPETEER_SKIP_DOWNLOAD         → nueva variable (puppeteer >= 20, usada por whatsapp-web.js internamente)
# PUPPETEER_SKIP_CHROMIUM_DOWNLOAD → variable legacy (puppeteer < 20)
# Se necesitan AMBAS porque whatsapp-web.js incluye su propia copia de puppeteer
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package*.json ./

# npm ci requiere package-lock.json; si no existe en el repo, usar npm install
RUN if [ -f package-lock.json ]; then \
        echo "✅ package-lock.json encontrado, usando npm ci" && \
        npm ci; \
    else \
        echo "⚠️  No hay package-lock.json, usando npm install" && \
        npm install; \
    fi \
    && npm cache clean --force

# Copiar código fuente y compilar
COPY . .
RUN npm run build

# Eliminar devDependencies para el stage runtime
RUN npm prune --production

# ============================================================
# STAGE 2: Runtime
# ============================================================
FROM node:20-slim AS runtime

LABEL maintainer="TED Potosi <sala.plena@oep.org.bo>"
LABEL version="2.0"
LABEL description="Sala Plena API - NestJS + WhatsApp + LDAP"

# Nombres correctos para Debian 12 (Bookworm):
#   chromium-browser   → chromium
#   libgcc1            → libgcc-s1
#   libgdk-pixbuf2.0-0 → libgdk-pixbuf-2.0-0
#   libgconf-2-4       → ELIMINADO
#   libxss1            → ELIMINADO
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    smbclient \
    cifs-utils \
    wget \
    ca-certificates \
    tzdata \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc-s1 \
    libgdk-pixbuf-2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

RUN groupadd -r appgroup && useradd -r -g appgroup -m appuser

# ── Zona horaria fija del sistema (Bolivia) ──
# Esto asegura la hora correcta incluso si TZ no se pasa por entorno.
ENV TZ=America/La_Paz
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/package*.json ./

RUN mkdir -p /app/uploads/temp /app/whatsapp-session /app/logs \
    && chown -R appuser:appgroup /app/uploads /app/whatsapp-session /app/logs

EXPOSE 3011

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3011/api || exit 1

USER appuser

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    WHATSAPP_SESSION_PATH=/app/whatsapp-session \
    NODE_ENV=production \
    TZ=America/La_Paz

CMD ["node", "dist/main.js"]