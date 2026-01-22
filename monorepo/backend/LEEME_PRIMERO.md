# 👋 ¡LÉEME PRIMERO!

## ¿Por dónde empiezo?

Has recibido un sistema completo de e-commerce listo para producción. Esta guía te dirá exactamente qué hacer.

---

## 🎯 Tu Misión

Poner en producción tu sistema de pagos y envíos para Morelatto Lanas en tu servidor.

**Tiempo estimado**: 30-45 minutos

---

## 📚 Documentos Disponibles (Lee en este orden)

### 1️⃣ EMPIEZA AQUÍ: [RESUMEN_CONFIGURACION.md](./RESUMEN_CONFIGURACION.md)
**¿Qué es?** Una visión general de TODO lo que se ha configurado.
**¿Cuándo leerlo?** AHORA. Te dará contexto de qué tienes disponible.
**Tiempo**: 5 minutos

### 2️⃣ LUEGO: [QUICK_START.md](./QUICK_START.md)
**¿Qué es?** Guía rápida para desplegar en 30 minutos.
**¿Cuándo seguirlo?** Después de leer el resumen, cuando estés listo para desplegar.
**Tiempo**: 30 minutos

### 3️⃣ MIENTRAS DESPLIEGAS: [CHECKLIST_DESPLIEGUE.md](./CHECKLIST_DESPLIEGUE.md)
**¿Qué es?** Una checklist interactiva para no olvidar nada.
**¿Cuándo usarla?** Mientras ejecutas QUICK_START.md, marca cada paso aquí.
**Tiempo**: Paralelo al despliegue

### 4️⃣ DESPUÉS DEL DESPLIEGUE: [CONFIGURACION_WEBHOOKS.md](./CONFIGURACION_WEBHOOKS.md)
**¿Qué es?** Guía detallada para configurar webhooks de pagos.
**¿Cuándo leerlo?** Después de desplegar, para activar los pagos automáticos.
**Tiempo**: 10 minutos

### 5️⃣ REFERENCIA COMPLETA: [GUIA_DESPLIEGUE_PRODUCCION.md](./GUIA_DESPLIEGUE_PRODUCCION.md)
**¿Qué es?** Guía completa con TODOS los detalles.
**¿Cuándo leerla?** Si tienes problemas o quieres entender algo en profundidad.
**Tiempo**: Referencia (no leer completa)

### 6️⃣ DOCUMENTACIÓN DEL SISTEMA: [README_PRODUCCION.md](./README_PRODUCCION.md)
**¿Qué es?** Manual de referencia del sistema en producción.
**¿Cuándo leerlo?** Después del despliegue, para mantener el sistema.
**Tiempo**: Referencia

### 7️⃣ SISTEMA DE PAGOS: [PAGOS_Y_ENVIOS.md](./PAGOS_Y_ENVIOS.md)
**¿Qué es?** Documentación técnica completa del sistema de pagos y envíos.
**¿Cuándo leerlo?** Para entender cómo funcionan los pagos y envíos.
**Tiempo**: Referencia

---

## 🚀 Plan de Acción (30 minutos)

### ☕ Preparación (5 min)

1. ✅ Lee [RESUMEN_CONFIGURACION.md](./RESUMEN_CONFIGURACION.md)
2. ✅ Ten a mano:
   - IP del servidor: `137.184.91.207`
   - Contraseña: `contraServidor2025morelatto`
   - Dominio: `morelattolanas.com`

### 🔧 Despliegue (30 min)

1. ✅ Abre [QUICK_START.md](./QUICK_START.md)
2. ✅ Abre [CHECKLIST_DESPLIEGUE.md](./CHECKLIST_DESPLIEGUE.md) al lado
3. ✅ Sigue QUICK_START paso a paso
4. ✅ Marca cada paso en CHECKLIST

### ✅ Verificación (5 min)

1. ✅ Verifica que `https://api.morelattolanas.com/health` responda
2. ✅ Lee [CONFIGURACION_WEBHOOKS.md](./CONFIGURACION_WEBHOOKS.md)
3. ✅ Configura webhooks de MercadoPago

---

## 🎯 Ruta Rápida (Si tienes prisa)

```bash
# 1. Conectarse al servidor
ssh root@137.184.91.207

# 2. Instalar Docker
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# 3. Subir código (desde tu máquina)
rsync -avz ./monorepo/backend/ root@137.184.91.207:/opt/apps/morelatto/

# 4. En el servidor
cd /opt/apps/morelatto
cp .env.production .env
nano .env  # Editar valores necesarios
chmod +x scripts/*.sh
./scripts/deploy.sh

# 5. Ver logs
./scripts/logs.sh
```

**IMPORTANTE**: Esto es solo una referencia rápida. Sigue [QUICK_START.md](./QUICK_START.md) para el proceso completo.

---

## ❓ Si tienes dudas

### "¿Qué tengo que configurar?"
→ Lee [RESUMEN_CONFIGURACION.md](./RESUMEN_CONFIGURACION.md)

### "¿Cómo despliego?"
→ Lee [QUICK_START.md](./QUICK_START.md)

### "Tengo un error"
→ Busca en [GUIA_DESPLIEGUE_PRODUCCION.md](./GUIA_DESPLIEGUE_PRODUCCION.md) sección "Solución de Problemas"

### "¿Cómo funciona el sistema de pagos?"
→ Lee [PAGOS_Y_ENVIOS.md](./PAGOS_Y_ENVIOS.md)

### "¿Qué comandos puedo usar?"
→ Lee [README_PRODUCCION.md](./README_PRODUCCION.md)

---

## 📁 Estructura de Archivos

```
monorepo/backend/
│
├── 📖 LEEME_PRIMERO.md                    ← ESTÁS AQUÍ
├── 📋 RESUMEN_CONFIGURACION.md            ← Lee esto primero
├── ⚡ QUICK_START.md                      ← Sigue esto para desplegar
├── ✅ CHECKLIST_DESPLIEGUE.md             ← Marca tu progreso aquí
├── 🔔 CONFIGURACION_WEBHOOKS.md           ← Después del despliegue
├── 📖 GUIA_DESPLIEGUE_PRODUCCION.md       ← Guía completa (referencia)
├── 📚 README_PRODUCCION.md                ← Manual del sistema
├── 💳 PAGOS_Y_ENVIOS.md                   ← Sistema de pagos (referencia)
│
├── 🐳 docker-compose.production.yml       ← Docker para producción
├── ⚙️ .env.production                     ← Variables de entorno (template)
│
├── 📂 scripts/                            ← Scripts útiles
│   ├── deploy.sh                         ← Desplegar
│   ├── setup-ssl.sh                      ← Configurar SSL
│   ├── backup-db.sh                      ← Hacer backup
│   ├── restore-db.sh                     ← Restaurar backup
│   └── logs.sh                           ← Ver logs
│
└── 📂 nginx/                              ← Configuración Nginx
    └── conf.d/                           ← Sites
```

---

## 🎁 ¿Qué está incluido?

### ✅ Sistema de Pagos
- MercadoPago (configurado, solo falta webhook)
- Stripe (opcional, requiere credenciales)
- Transferencia bancaria (listo)

### ✅ Sistema de Envíos
- PAQ.AR / Correo Argentino (requiere API key)
- Andreani (requiere credenciales)
- OCA (requiere credenciales)
- Manual (listo)

### ✅ Infraestructura
- Docker Compose completo
- Nginx con SSL automático
- PostgreSQL
- Scripts de mantenimiento
- Documentación completa

---

## 🆘 Ayuda Rápida

### Ver estado de servicios
```bash
cd /opt/apps/morelatto
docker compose -f docker-compose.production.yml ps
```

### Ver logs
```bash
./scripts/logs.sh
```

### Hacer backup
```bash
./scripts/backup-db.sh
```

### Reiniciar servicios
```bash
docker compose -f docker-compose.production.yml restart
```

### Health check
```bash
curl https://api.morelattolanas.com/health
```

---

## 📊 Progreso Esperado

```
[0%]   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  Inicio
       ↓
[10%]  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  Leer documentación
       ↓
[30%]  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  Preparar servidor
       ↓
[50%]  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  Desplegar código
       ↓
[70%]  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  Configurar SSL
       ↓
[90%]  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  Configurar webhooks
       ↓
[100%] ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅  ¡PRODUCCIÓN!
```

---

## 🎉 Mensaje Final

Todo está preparado para que pongas tu e-commerce en producción en menos de una hora.

**Siguiente paso**: Lee [RESUMEN_CONFIGURACION.md](./RESUMEN_CONFIGURACION.md) para entender qué tienes disponible.

**¡Mucha suerte con el lanzamiento! 🚀**

---

## 📞 Contacto

Si algo no funciona:
1. Revisa los logs: `./scripts/logs.sh`
2. Consulta la sección de troubleshooting en [GUIA_DESPLIEGUE_PRODUCCION.md](./GUIA_DESPLIEGUE_PRODUCCION.md)
3. Verifica tu checklist en [CHECKLIST_DESPLIEGUE.md](./CHECKLIST_DESPLIEGUE.md)

---

**Versión**: 1.0.0
**Fecha**: 2026-01-07
**Estado**: ✅ Listo para producción
