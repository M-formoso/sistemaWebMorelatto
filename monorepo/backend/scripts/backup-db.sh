#!/bin/bash
# ==========================================================
# SCRIPT DE BACKUP - BASE DE DATOS
# ==========================================================
# Este script hace backup de la base de datos PostgreSQL
# ==========================================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuración
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="morelatto_db_backup_${TIMESTAMP}.sql"
CONTAINER_NAME="morelatto_db_prod"

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  BACKUP DE BASE DE DATOS${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Crear directorio de backups si no existe
mkdir -p ${BACKUP_DIR}

echo -e "${YELLOW}Creando backup de la base de datos...${NC}"
echo -e "Archivo: ${BACKUP_FILE}"
echo ""

# Hacer backup usando pg_dump dentro del contenedor
docker exec ${CONTAINER_NAME} pg_dump -U morelatto -d morelatto_db > ${BACKUP_DIR}/${BACKUP_FILE}

# Comprimir el backup
echo -e "${YELLOW}Comprimiendo backup...${NC}"
gzip ${BACKUP_DIR}/${BACKUP_FILE}

echo ""
echo -e "${GREEN}✓ Backup completado exitosamente${NC}"
echo -e "Ubicación: ${BACKUP_DIR}/${BACKUP_FILE}.gz"
echo ""

# Mostrar tamaño del backup
BACKUP_SIZE=$(du -h ${BACKUP_DIR}/${BACKUP_FILE}.gz | cut -f1)
echo -e "Tamaño: ${BACKUP_SIZE}"
echo ""

# Listar últimos 5 backups
echo -e "${YELLOW}Últimos backups:${NC}"
ls -lht ${BACKUP_DIR} | head -6
echo ""

# Limpiar backups antiguos (mantener últimos 10)
echo -e "${YELLOW}Limpiando backups antiguos (manteniendo últimos 10)...${NC}"
cd ${BACKUP_DIR}
ls -t morelatto_db_backup_*.sql.gz | tail -n +11 | xargs -r rm
cd ..

echo -e "${GREEN}✓ Limpieza completada${NC}"
echo ""
