# SIC — Sistema de Ingresos Consulares (Hacienda)

Aplicación web para registrar la recaudación consular de las embajadas y consulados, generar los informes contables mensuales (PDF + Excel) y gestionar su ciclo de aprobación con firma digital.

## Requisitos

- Node.js 20+ (incluye `npm`)
- No se necesita servidor de base de datos: usa SQLite (`dev.db`)

## Puesta en marcha

**Opción 1 — Windows (doble clic):** ejecutar `Iniciar_SIC_Hacienda.bat` (escritorio). Libera el puerto 3000 si había un servidor colgado, levanta el sistema y abre `http://localhost:3000/login`.

**Opción 2 — consola:**

```bash
npm install
npm run db:seed     # admin + 90 consulados (idempotente)
npm run dev         # http://localhost:3000
```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` / `npm start` | Compilación y arranque en producción |
| `npm run lint` | Verificación con ESLint |
| `npm run db:seed` | Sembrado inicial: usuario administrador y directorio consular |
| `npm run db:migrate-status` | Normaliza el estado de los registros existentes |
| `npm run reset-admin` | Restablece la contraseña del administrador (`NEW_PASSWORD=... npm run reset-admin`) |

## Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Ruta de SQLite (`file:./dev.db`) |
| `JWT_SECRET` | Secreto de firma de las sesiones (obligatorio) |
| `SEED_ADMIN_PASSWORD` | Contraseña inicial del admin en `db:seed` (mínimo 8) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME` | Servidor de correo para notificaciones reales. Sin definir, `/api/notificaciones*` responde `503` indicándolo |

## Estructura

```
prisma/          Esquema, semilla y datos del catálogo consular
src/proxy.ts     Middleware: sesión JWT y rutas protegidas
src/app/         Páginas (App Router) y Route Handlers en src/app/api/
src/lib/         Autenticación/autorización, Prisma, SMTP, storage y generadores de reportes
storage/         Reportes generados (PDF/Excel), servidos por /api/archivos
docs/            Manuales (usuarios, técnico, desarrollador) y presentación comercial
```

## Documentación

- `docs/manual-usuarios.md` — guía de uso por módulos
- `docs/manual-tecnico.md` — arquitectura, modelos de datos y endpoints
- `docs/manual-desarrollador.md` — flujo de desarrollo y convenciones
- `docs/presentacion-comercial.md` — documento de demostración
