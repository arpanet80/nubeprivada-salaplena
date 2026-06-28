#!/bin/sh
set -e

# ============================================================
# Entrypoint - Genera env.js a partir de env.template.js
# sustituyendo las variables de entorno reales del contenedor.
# ============================================================

TEMPLATE_FILE=/usr/share/nginx/html/env.template.js
OUTPUT_FILE=/usr/share/nginx/html/env.js

# Valores por defecto si no se pasan las variables
export API_URL="${API_URL:-http://10.51.15.41:3011/}"
export API_URL_USER="${API_URL_USER:-http://10.51.15.41:3011/}"
export REPORTS_URL="${REPORTS_URL:-http://10.51.15.110:8123/api/reports/}"
export DEBUG="${DEBUG:-false}"

if [ -f "$TEMPLATE_FILE" ]; then
  envsubst '${API_URL} ${API_URL_USER} ${REPORTS_URL} ${DEBUG}' < "$TEMPLATE_FILE" > "$OUTPUT_FILE"
  echo "✅ env.js generado desde env.template.js con:"
  echo "   API_URL: ${API_URL}"
  echo "   API_URL_USER: ${API_URL_USER}"
  echo "   REPORTS_URL: ${REPORTS_URL}"
  echo "   DEBUG: ${DEBUG}"
else
  echo "⚠️  No se encontró ${TEMPLATE_FILE}, se usará el env.js incluido en el build (si existe)."
fi

# Ejecutar el comando original (nginx)
exec "$@"