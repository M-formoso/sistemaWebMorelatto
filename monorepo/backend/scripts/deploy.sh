#!/bin/bash
# ==========================================================
# SCRIPT DE DESPLIEGUE - MORELATTO LANAS
# ==========================================================
# Este script despliega la aplicación en producción
# ==========================================================

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  DESPLEGANDO MORELATTO LANAS - BACKEND${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.production.yml" ]; then
    echo -e "${RED}ERROR: No se encontró docker-compose.production.yml${NC}"
    echo "Por favor ejecuta este script desde el directorio backend/"
    exit 1
fi

# Verificar que existe .env.production
if [ ! -f ".env.production" ]; then
    echo -e "${RED}ERROR: No se encontró .env.production${NC}"
    echo "Por favor crea el archivo .env.production con las credenciales de producción"
    exit 1
fi

# Preguntar si hacer backup
echo -e "${YELLOW}¿Deseas hacer un backup de la base de datos antes de desplegar? (s/n)${NC}"
read -r response
if [[ "$response" =~ ^([sS][iI]|[sS])$ ]]; then
    echo -e "${GREEN}Haciendo backup...${NC}"
    ./scripts/backup-db.sh
fi

echo ""
echo -e "${GREEN}Paso 1: Deteniendo contenedores existentes...${NC}"
docker-compose -f docker-compose.production.yml down

echo ""
echo -e "${GREEN}Paso 2: Construyendo imágenes...${NC}"
docker-compose -f docker-compose.production.yml build --no-cache

echo ""
echo -e "${GREEN}Paso 3: Iniciando servicios...${NC}"
docker-compose -f docker-compose.production.yml up -d

echo ""
echo -e "${GREEN}Paso 4: Esperando que los servicios estén listos...${NC}"
sleep 10

echo ""
echo -e "${GREEN}Paso 5: Verificando estado de los contenedores...${NC}"
docker-compose -f docker-compose.production.yml ps

echo ""
echo -e "${GREEN}Paso 6: Mostrando logs recientes...${NC}"
docker-compose -f docker-compose.production.yml logs --tail=50

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  DESPLIEGUE COMPLETADO${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "Servicios disponibles:"
echo -e "  ${GREEN}✓${NC} Base de datos PostgreSQL (interno)"
echo -e "  ${GREEN}✓${NC} API Backend: http://localhost:8000 (interno)"
echo -e "  ${GREEN}✓${NC} Nginx: http://localhost:80 y https://localhost:443"
echo ""
echo -e "Comandos útiles:"
echo -e "  Ver logs:        docker-compose -f docker-compose.production.yml logs -f"
echo -e "  Ver logs API:    docker-compose -f docker-compose.production.yml logs -f api"
echo -e "  Reiniciar:       docker-compose -f docker-compose.production.yml restart"
echo -e "  Detener:         docker-compose -f docker-compose.production.yml down"
echo ""
echo -e "${YELLOW}IMPORTANTE: No olvides configurar los webhooks en MercadoPago y Stripe${NC}"
echo ""
