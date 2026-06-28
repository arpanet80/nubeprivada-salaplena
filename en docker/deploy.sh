#!/bin/bash
# ============================================================
# deploy.sh - Script de despliegue en producción
# Servidor: 10.51.15.41 (Debian 12 + Docker)
# ============================================================


## ============================================================
# USO DEL SCRIPT
# ./deploy.sh deploy    # despliega (default si no pasas argumento)
# ./deploy.sh status    # solo muestra el estado actual
# ./deploy.sh logs api  # sigue logs en vivo de la API
# ./deploy.sh logs app  # sigue logs en vivo del UI
## ============================================================

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
REGISTRY="10.51.15.42:5000"
API_IMAGE="${REGISTRY}/sala-plena-api:latest"
UI_IMAGE="${REGISTRY}/sala-plena-ui:latest"
COMPOSE_FILE="/home/dante/sala-plena/docker-compose.yml"
ENV_FILE="/home/dante/sala-plena/.env"
BACKUP_DIR="/opt/backups/sala-plena"

# Funciones
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Verificando prerequisitos..."

    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker no está instalado"
        exit 1
    fi

    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose no está instalado"
        exit 1
    fi

    # Verificar que existe el docker-compose.yml
    if [ ! -f "${COMPOSE_FILE}" ]; then
        log_error "No se encontró ${COMPOSE_FILE}"
        exit 1
    fi

    # Verificar que existe el .env con las credenciales
    if [ ! -f "${ENV_FILE}" ]; then
        log_error "No se encontró ${ENV_FILE}. Copia .env.example como .env y completa los valores."
        exit 1
    fi

    # Verificar conectividad al registry
    if ! curl -sk "https://${REGISTRY}/v2/" > /dev/null; then
        log_warn "No se puede conectar al registry ${REGISTRY}"
        log_info "Verificando si el registry está accesible..."
    fi

    # Verificar espacio en disco
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 85 ]; then
        log_warn "Uso de disco alto: ${DISK_USAGE}%"
        read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    log_success "Prerequisitos OK"
}

backup_current() {
    log_info "Creando backup de la configuración actual..."

    mkdir -p "${BACKUP_DIR}"
    BACKUP_FILE="${BACKUP_DIR}/backup-$(date +%Y%m%d-%H%M%S).tar.gz"

    if [ -f "${COMPOSE_FILE}" ]; then
        tar -czf "${BACKUP_FILE}" -C "$(dirname "${COMPOSE_FILE}")" . 2>/dev/null || true
        log_success "Backup creado: ${BACKUP_FILE}"
    else
        log_warn "No hay configuración previa para backup"
    fi
}

pull_images() {
    log_info "Descargando imágenes del registry..."

    docker pull "${API_IMAGE}" || {
        log_error "No se pudo descargar la imagen API"
        exit 1
    }

    docker pull "${UI_IMAGE}" || {
        log_error "No se pudo descargar la imagen UI"
        exit 1
    }

    log_success "Imágenes descargadas correctamente"
}

deploy() {
    log_info "Iniciando despliegue..."

    cd "$(dirname "${COMPOSE_FILE}")"

    # Detener servicios actuales
    log_info "Deteniendo servicios actuales..."
    docker-compose down --remove-orphans || docker compose down --remove-orphans || true

    # Limpiar imágenes antiguas (mantener últimas 3 versiones)
    log_info "Limpiando imágenes antiguas..."
    docker image prune -af --filter "until=168h" --filter "label!=keep" || true

    # Iniciar servicios
    log_info "Iniciando servicios..."
    docker-compose up -d || docker compose up -d

    # Esperar a que los servicios estén saludables
    log_info "Esperando healthchecks..."
    sleep 10

    # Verificar API
    for i in {1..12}; do
        if curl -s http://localhost:3011/api > /dev/null; then
            log_success "API respondiendo en puerto 3011"
            break
        fi
        if [ $i -eq 12 ]; then
            log_error "API no respondió después de 60 segundos"
            docker-compose logs api --tail=50
            exit 1
        fi
        sleep 5
    done

    # Verificar UI
    for i in {1..12}; do
        if curl -s http://localhost:8572 > /dev/null; then
            log_success "UI respondiendo en puerto 8572"
            break
        fi
        if [ $i -eq 12 ]; then
            log_error "UI no respondió después de 60 segundos"
            docker-compose logs app --tail=50
            exit 1
        fi
        sleep 5
    done

    # Verificar que env.js se generó bien (sin placeholders ${...} sin sustituir)
    log_info "Verificando env.js generado en el contenedor UI..."
    ENV_JS_CONTENT=$(docker exec sala-plena-ui cat /usr/share/nginx/html/env.js 2>/dev/null || echo "")
    if [ -z "${ENV_JS_CONTENT}" ]; then
        log_error "No se pudo leer env.js dentro del contenedor sala-plena-ui"
        exit 1
    elif echo "${ENV_JS_CONTENT}" | grep -q '\${'; then
        log_error "env.js tiene placeholders sin sustituir (envsubst no corrió bien):"
        echo "${ENV_JS_CONTENT}"
        exit 1
    else
        log_success "env.js generado correctamente con valores reales"
    fi

    log_success "¡Despliegue completado exitosamente!"
}

show_status() {
    log_info "Estado de los servicios:"
    echo
    docker-compose ps || docker compose ps
    echo
    log_info "Uso de recursos:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Menú principal
case "${1:-deploy}" in
    deploy)
        check_prerequisites
        backup_current
        pull_images
        deploy
        show_status
        ;;
    status)
        show_status
        ;;
    logs)
        docker-compose logs -f "${2:-api}"
        ;;
    rollback)
        log_info "Rollback a versión anterior..."
        # Implementar rollback desde backup
        ;;
    *)
        echo "Uso: $0 {deploy|status|logs|rollback}"
        exit 1
        ;;
esac