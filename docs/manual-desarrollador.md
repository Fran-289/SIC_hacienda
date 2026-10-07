# Manual del Desarrollador - SIC Hacienda

Este documento provee las instrucciones necesarias para descargar, instalar, modificar y hacer el mantenimiento del **Sistema de Ingresos Consulares (SIC) - Hacienda** a nivel de código fuente.

---

## 1. Requisitos Previos

Antes de clonar el repositorio, asegúrese de contar con el siguiente software instalado en su máquina:

*   **Node.js:** Versión 20.9 o superior (Se ha probado y validado con Node 24).
*   **Gestor de paquetes:** `npm` (incluido por defecto con Node.js).
*   **Git:** Para control de versiones.
*   **VS Code (Recomendado):** Con extensiones para ESLint, Tailwind CSS y Prisma.

---

## 2. Instalación y Configuración del Entorno

Siga estos pasos al pie de la letra para levantar el proyecto localmente.

### Paso 1: Clonar e Instalar
```bash
git clone https://github.com/Fran-289/SIC_hacienda.git
cd sic-hacienda
npm install
```

### Paso 2: Variables de Entorno
Cree un archivo `.env` en la raíz del proyecto. El sistema requiere lo siguiente:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="mi_clave_secreta_de_desarrollo_muy_segura"
```

### Paso 3: Inicializar Base de Datos
Dado que se utiliza SQLite, la base de datos se crea localmente como un archivo (`dev.db`). Para construir la estructura:
```bash
# Sincroniza el esquema de Prisma con SQLite
npx prisma db push

# Regenera el cliente local de Prisma
npx prisma generate
```

### Paso 4: Poblado Inicial de Datos (Semillas)
El sistema necesita al menos un usuario administrador y el catálogo base para funcionar. La contraseña del administrador **no tiene valor por defecto**: debés definirla en `.env`:
```bash
# .env
SEED_ADMIN_PASSWORD="TuContraseñaSegura1"

# Crea el usuario admin@hacienda.gob.sv con la contraseña del entorno
npm run db:seed
```
> Para regenerar la contraseña de un usuario existente: `NEW_PASSWORD="..." npm run reset-admin -- correo@dominio`

### Paso 5: Arrancar el Servidor
```bash
# Arranca Next.js usando Turbopack para mayor velocidad
npm run dev
```
Abra su navegador en `http://localhost:3000`.

---

## 3. Estructura de Directorios

El código fuente está estructurado de acuerdo a las convenciones de Next.js App Router.

*   `/prisma`: Contiene el esquema de la base de datos (`schema.prisma`) y los scripts de semilla.
*   `/storage`: (Ignorado por Git) Directorio donde se almacenan físicamente los PDFs y Excel generados; se sirven mediante `GET /api/archivos/[...slug]`.
*   `/src/app`: Rutas y vistas de la aplicación.
    *   `/src/app/api`: Contiene todos los Route Handlers (Backend).
    *   `/src/app/(dashboard)`: Páginas protegidas que comparten el Sidebar.
*   `/src/components`: Componentes aislados (Botones, Modales, Themes).
*   `/src/lib`: Librerías core (Configuración de Auth, instancia de Prisma, Utilitarios).
    *   `/src/lib/reports/generators`: Lógica pura de generación de PDFs.
*   `src/proxy.ts`: Middleware global de Next.js que controla el acceso de sesiones.

---

## 4. Guía Rápida de Desarrollo

### 4.1 Modificar el Esquema de Base de Datos
Si requiere agregar una tabla o columna nueva:
1. Abra `prisma/schema.prisma` y añada el nuevo modelo/campo.
2. Ejecute `npx prisma db push`.
3. Ejecute `npx prisma generate`.
4. **IMPORTANTE:** Reinicie su servidor de desarrollo (`npm run dev`) para que los cambios se reflejen en los Server Components.

### 4.2 Crear una Nueva API
Las APIs en Next.js App Router se ubican en `/src/app/api`. La autorización se resuelve con los ayudantes de `src/lib/authz.ts`:
```typescript
// src/app/api/mi-ruta/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthz } from '@/lib/authz';

export async function POST(req: Request) {
    // Verifica sesión + permiso de módulo ('ingresos' | 'reportes' | 'directorio' | null)
    const auth = await requireAuthz('ingresos');
    if (!auth.ok) return auth.response;

    const data = await req.json();
    // Lógica con prisma...
    return NextResponse.json({ success: true, data });
}
```
Use `requireAdminAuthz()` cuando la operación sea exclusiva de administradores (usuarios, configuración, firma).

### 4.3 Generación de Reportes PDF
Cualquier modificación visual a los PDFs debe hacerse en `/src/lib/reports/generators/`. 
Tenga en cuenta que el sistema utiliza `jsPDF` midiendo coordenadas en **milímetros**, mientras que la firma digital (`pdf-lib`) insertada en `route.ts` trabaja en **puntos (pt)**, requiriendo una conversión matemática `(Y * 2.83465)` para empalmar correctamente los sellos.

---

## 5. Control de Calidad y Git

Antes de realizar cualquier `git commit`, asegúrese de correr los siguientes comandos:
```bash
# Valida reglas de formato y código estático (ESLint)
npm run lint

# Simula la compilación de producción para detectar errores TypeScript
npm run build
```

El repositorio descarta de forma automática (en `.gitignore`) todos los archivos `.db`, los `.js` residuales en la raíz, los archivos de prueba (`test*.ts`), la carpeta `/scripts` y todo el directorio dinámico `/storage/` para evitar filtraciones de datos locales de desarrollo hacia producción.
