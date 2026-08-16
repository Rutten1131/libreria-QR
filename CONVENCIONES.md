# Convenciones — LibreríaQR

## Estructura de carpetas
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

## Convenciones de nomenclatura
- Archivos TypeScript: `camelCase.ts` (ej. `pedidoService.ts`)
- Componentes React: `PascalCase.tsx` (ej. `PedidoCard.tsx`)
- Rutas URL: `kebab-case` (ej. `/panel/pedidos`)
- Clases/Interfaces: `PascalCase` (ej. `interface Pedido`)
- Constantes: `UPPER_SNAKE_CASE` (ej. `ESTADO_PEDIDO`)

## Reglas del repositorio
- No commit directo a `main` — todo vía PR
- Mensajes de commit: usar conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Branch naming: `feat/nombre`, `fix/nombre`, `chore/nombre`

## Reglas de código
- Tipado estricto — ningún `any` sin justificación explícita
- Funciones pequeñas — máximo 50 líneas por función
- Separación clara entre domain (lógica pura) y adapters (I/O)
