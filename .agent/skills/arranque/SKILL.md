---
name: arranque
description: Se usa cuando se arranca el proyecto LibreríaQR de cero — ninguna línea de código existe todavía. Define el orden mínimo viable para tener el flujo feliz de un pedido WhatsApp funcionando con datos ficticios.
---

# Skill — Arranque LibreríaQR

## Objetivo
Tener el **flujo feliz completo de un pedido por WhatsApp, de punta a punta**, con datos de una papelería ficticia. Nada más.

## Stackmandado
- **Backend/orquestación:** Node.js / TypeScript
- **Paneles:** Next.js
- **WhatsApp:** Evolution API (conexión simulada para el piloto)
- **Base de datos:** SQLite en memoria para el piloto (fácil de migrar a VPS después)
- **IA/OCR:** Grok API (stub/mock para el piloto, sin costo)

## Ordenmandado — Día 1 (no negociable)

### Paso 1 — Git y convenciones
```bash
cd libreriasQR
git init
echo "node_modules/" > .gitignore
echo "dist/" >> .gitignore
echo ".env" >> .gitignore
git add .
git commit -m "chore: proyecto inicial"
```

Crear `CONVENCIONES.md` con:
- Estructura de carpetas (ver más abajo)
- Convenciones de nomenclatura (camelCase para archivos TS, kebab-case para rutas)
- Reglas del repositorio: PRs para todo, no commit directo a main

### Paso 2 — Estructura de carpetas
```
libreriasqr/
├── backend/              # Node.js + TypeScript (orquestación, WhatsApp, IA)
│   ├── src/
│   │   ├── domain/       # Entidades: Tenant, Pedido, Producto, Variante
│   │   ├── services/     # Lógica de negocio pura
│   │   ├── adapters/     # Evolution API, Grok API, SQLite
│   │   ├── orchestrate/   # Orquestador del flujo de conversación
│   │   └── index.ts      # Entry point
│   ├── data/             # Papelería ficticia (inventario seed)
│   └── package.json
├── panels/              # Next.js (Panel Inventario, Pedidos, Despachos)
│   ├── src/app/
│   │   ├── api/          # Rutas API del panel
│   │   └── panel/
│   ├── src/components/
│   └── package.json
├── .gitignore
├── CONVENCIONES.md
└── README.md
```

### Paso 3 — Backend mínimo (core del flujo feliz)
Crear en `backend/` un proyecto Node.js + TypeScript mínimo que:
1. Defina las entidades `Tenant`, `Producto`, `Pedido` (en `domain/`)
2. Tenga un servicio de matching que dada una lista de textos, encuentre productos en el catálogo por nombre (sin IA, solo fuzzy string match simple)
3. Tenga un servicio de cotización que dado un array de ítems matched, sume los precios reales
4. Tenga datos seed de una papelería ficticia: "Librería El Sol" con ~20 productos (útiles escolares, precios, variantes)
5. Exponga un endpoint `POST /cotizar` que reciba `{ tenantId, lista: string[] }` y devuelva `{ items: [...], total, ambiguos: [...] }`
6. Exponga un endpoint `POST /pedido` que reciba la cotización confirmada y la guarde como Pedido en estado "Necesita revisión"

### Paso 4 — Paneles mínimos
Crear en `paneles/` un proyecto Next.js con:
1. `src/app/panel/inventario/page.tsx` — tabla de productos con buscador + botón Available/Agotado (estado hardcodeado, sin backend todavía)
2. `src/app/panel/pedidos/page.tsx` — tablero Kanban de 3 columnas con al menos 3 pedidos mock hardcodeados
3. `src/app/panel/despachos/page.tsx` — lista de comandas mock

### Paso 5 — Deploy temprano
1. Backend: hacer `npm run build` en `backend/`, verificar que compila sin errores
2. Paneles: hacer `npm run build` en `paneles/`, verificar que compila sin errores
3. Hacer deploy del panel a Vercel (solo el build, sin dominio configurado todavía — registrar el URL)
4. Subir el código a GitHub con el remote configurado

## Cosas que NO se tocan en el Día 1
- Cualquier cosa listada como "fuera de alcance del MVP" en el PRD (A.6.4)
- Canal 2 web (Web QR)
- Programa de referidos (Parte B del PRD)
- Payphone, Evolution API real, Grok real
- Multi-tenant real (el primer commit solo tiene una papelería hardcodeada)
- Panel de Despachos funcional (solo mock)

## Sinaliento
Si en algún paso algo no compila o no deploya, no seguir al siguiente paso — resolver el error antes de avanzar. El objetivo del día 1 es tener algo físico deployado, por minimal que sea.

## Siguiente paso (después del Día 1)
El flujo completo de WhatsApp: integración con Evolution API simulada para procesar un mensaje de texto de un cliente ficticio → OCR mock → matching → cotización → confirmación → pedido en el panel.
