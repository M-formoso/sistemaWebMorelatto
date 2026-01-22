#!/bin/bash
# ==========================================================
# SCRIPT DE CONFIGURACIÓN SSL - MORELATTO LANAS
# ==========================================================
# Este script obtiene un certificado SSL de Let's Encrypt
# ==========================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuración
DOMAIN="api.morelattolanas.com"  # Cambiar si usas otro subdominio
EMAIL="tu-email@ejemplo.com"     # IMPORTANTE: Cambiar por tu email real

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  CONFIGURANDO SSL PARA MORELATTO LANAS${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Verificar que Docker esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker no está corriendo${NC}"
    exit 1
fi

# Verificar que los servicios estén corriendo
if ! docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    echo -e "${YELLOW}Los servicios no están corriendo. Iniciando...${NC}"
    docker-compose -f docker-compose.production.yml up -d
    sleep 5
fi

echo -e "${GREEN}Paso 1: Verificando configuración de Nginx...${NC}"
if [ ! -f "nginx/conf.d/morelatto.conf" ]; then
    echo -e "${RED}ERROR: No se encontró nginx/conf.d/morelatto.conf${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Paso 2: Obteniendo certificado SSL de Let's Encrypt...${NC}"
echo -e "${YELLOW}Dominio: ${DOMAIN}${NC}"
echo -e "${YELLOW}Email: ${EMAIL}${NC}"
echo ""

# Obtener certificado
docker-compose -f docker-compose.production.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    -d ${DOMAIN}

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Certificado obtenido exitosamente${NC}"

    echo ""
    echo -e "${GREEN}Paso 3: Activando configuración SSL...${NC}"

    # Renombrar configuración HTTP
    if [ -f "nginx/conf.d/morelatto.conf" ]; then
        mv nginx/conf.d/morelatto.conf nginx/conf.d/morelatto-http.conf.disabled
        echo -e "${GREEN}✓ Configuración HTTP deshabilitada${NC}"
    fi

    # Activar configuración SSL
    if [ -f "nginx/conf.d/morelatto-ssl.conf.template" ]; then
        # Reemplazar dominio en el template
        sed "s/api.morelatto.com/${DOMAIN}/g" nginx/conf.d/morelatto-ssl.conf.template > nginx/conf.d/morelatto-ssl.conf
        echo -e "${GREEN}✓ Configuración SSL activada${NC}"
    fi

    echo ""
    echo -e "${GREEN}Paso 4: Recargando Nginx...${NC}"
    docker-compose -f docker-compose.production.yml exec nginx nginx -s reload

    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}  SSL CONFIGURADO EXITOSAMENTE${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo -e "Tu sitio ahora está disponible en:"
    echo -e "  ${GREEN}https://${DOMAIN}${NC}"
    echo ""
    echo -e "El certificado se renovará automáticamente cada 12 horas"
    echo ""
else
    echo ""
    echo -e "${RED}ERROR: No se pudo obtener el certificado SSL${NC}"
    echo ""
    echo "Verifica que:"
    echo "  1. El dominio ${DOMAIN} apunta a la IP de este servidor"
    echo "  2. El puerto 80 está abierto en el firewall"
    echo "  3. Nginx está corriendo correctamente"
    echo ""
    exit 1
fi
