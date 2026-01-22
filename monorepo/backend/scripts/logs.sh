#!/bin/bash
# ==========================================================
# SCRIPT PARA VER LOGS - MORELATTO LANAS
# ==========================================================

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  LOGS DE MORELATTO LANAS${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Selecciona qué logs ver:"
echo ""
echo "  1) Todos los servicios"
echo "  2) Solo API"
echo "  3) Solo Base de datos"
echo "  4) Solo Nginx"
echo ""
echo -e "${YELLOW}Opción (1-4):${NC} "
read option

case $option in
    1)
        echo -e "${GREEN}Mostrando logs de todos los servicios...${NC}"
        docker-compose -f docker-compose.production.yml logs -f --tail=100
        ;;
    2)
        echo -e "${GREEN}Mostrando logs de la API...${NC}"
        docker-compose -f docker-compose.production.yml logs -f --tail=100 api
        ;;
    3)
        echo -e "${GREEN}Mostrando logs de la base de datos...${NC}"
        docker-compose -f docker-compose.production.yml logs -f --tail=100 db
        ;;
    4)
        echo -e "${GREEN}Mostrando logs de Nginx...${NC}"
        docker-compose -f docker-compose.production.yml logs -f --tail=100 nginx
        ;;
    *)
        echo "Opción inválida"
        exit 1
        ;;
esac
