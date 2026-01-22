#!/bin/bash
# ==========================================================
# SCRIPT DE RESTAURACIÓN - BASE DE DATOS
# ==========================================================
# Este script restaura un backup de la base de datos
# ==========================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuración
BACKUP_DIR="./backups"
CONTAINER_NAME="morelatto_db_prod"

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  RESTAURAR BASE DE DATOS${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Verificar que existe el directorio de backups
if [ ! -d "${BACKUP_DIR}" ]; then
    echo -e "${RED}ERROR: No se encontró el directorio de backups${NC}"
    exit 1
fi

# Listar backups disponibles
echo -e "${YELLOW}Backups disponibles:${NC}"
echo ""
ls -lht ${BACKUP_DIR}/*.sql.gz 2>/dev/null || {
    echo -e "${RED}No hay backups disponibles${NC}"
    exit 1
}
echo ""

# Pedir al usuario que ingrese el nombre del archivo
echo -e "${YELLOW}Ingresa el nombre del archivo de backup (con extensión .sql.gz):${NC}"
read BACKUP_FILE

# Verificar que el archivo existe
if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    echo -e "${RED}ERROR: No se encontró el archivo ${BACKUP_FILE}${NC}"
    exit 1
fi

# Advertencia
echo ""
echo -e "${RED}ADVERTENCIA: Esta acción eliminará todos los datos actuales de la base de datos${NC}"
echo -e "${YELLOW}¿Estás seguro que deseas continuar? (escribe 'SI' para confirmar)${NC}"
read CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    echo -e "${YELLOW}Operación cancelada${NC}"
    exit 0
fi

# Descomprimir backup
echo ""
echo -e "${YELLOW}Descomprimiendo backup...${NC}"
gunzip -c ${BACKUP_DIR}/${BACKUP_FILE} > ${BACKUP_DIR}/temp_restore.sql

# Detener la API temporalmente
echo -e "${YELLOW}Deteniendo API temporalmente...${NC}"
docker-compose -f docker-compose.production.yml stop api

# Restaurar base de datos
echo -e "${YELLOW}Restaurando base de datos...${NC}"
docker exec -i ${CONTAINER_NAME} psql -U morelatto -d morelatto_db < ${BACKUP_DIR}/temp_restore.sql

# Limpiar archivo temporal
rm ${BACKUP_DIR}/temp_restore.sql

# Reiniciar servicios
echo -e "${YELLOW}Reiniciando servicios...${NC}"
docker-compose -f docker-compose.production.yml start api

echo ""
echo -e "${GREEN}✓ Base de datos restaurada exitosamente${NC}"
echo ""
