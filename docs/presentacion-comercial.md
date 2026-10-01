# Sistema de Ingresos Consulares (SIC) - Hacienda
## Documento de Demostración Comercial

Este documento presenta una visión integral del **Sistema de Ingresos Consulares (SIC)**, una plataforma moderna, segura y de alto rendimiento diseñada específicamente para digitalizar, controlar y agilizar la recaudación consular y la generación de informes contables.

---

## 1. Visión General del Sistema
El SIC reemplaza los procesos manuales y el uso de hojas de cálculo aisladas por un entorno web centralizado. Garantiza la integridad de los datos financieros, automatiza cálculos complejos y digitaliza el proceso de aprobación mediante un módulo de firma digital incorporado.

**Beneficios Clave:**
- **Reducción de tiempos:** Generación de reportes de saldos y liquidaciones en segundos.
- **Seguridad:** Arquitectura moderna, encriptación de datos, control de roles (Administrador/Usuario) e historial de auditoría.
- **Trazabilidad:** Seguimiento en tiempo real del estado de cada ingreso (Ingresado, Revisado, Vinculado).
- **Cero papel:** Motor de firma digital que estampa la rúbrica oficial directamente en el PDF, listo para su archivo o distribución.

---

## 2. Recorrido por la Interfaz de Usuario

### 2.1. Pantalla de Acceso (Login)
*(Insertar captura de pantalla del Login aquí)*
`![Login](./capturas/login.png)`

Una puerta de entrada segura. Protegida con autenticación mediante JWT (JSON Web Tokens) y contraseñas encriptadas, asegura que solo el personal autorizado de Hacienda pueda ingresar a la plataforma.

### 2.2. Bandeja de Ingresos
*(Insertar captura de pantalla de la Bandeja de Ingresos)*
`![Bandeja de Ingresos](./capturas/ingresos.png)`

El corazón operativo del sistema. Aquí los usuarios registran las transacciones de las sedes consulares.
- **Interfaz limpia y responsiva.**
- **Filtros inteligentes:** Búsqueda rápida por consulado, fechas, tipo de ingreso o estado.
- **Validaciones en tiempo real:** Previene errores humanos al introducir montos o referencias.

### 2.3. Bandeja de Reportes (Generación de Informes)
*(Insertar captura de pantalla del modal de Generar Reportes)*
`![Generar Reportes](./capturas/generar-reportes.png)`

Donde la magia ocurre. El sistema agrupa automáticamente los ingresos de un mes y año específicos y genera el paquete documental oficial.
- **Generación múltiple:** Produce tanto versiones en PDF (listas para firmar) como versiones en Excel (para análisis de datos).
- 7 tipos de reportes consolidados (Saldos, Caja, Liquidaciones, Transferencias, etc.) generados con 1 solo clic.

### 2.4. Tareas Pendientes y Firma Digital
*(Insertar captura de pantalla de Tareas Pendientes con el "Ojito Verde" y Sello)*
`![Tareas Pendientes](./capturas/tareas-pendientes.png)`
`![Firma Digital en PDF](./capturas/sello-firma.png)`

El módulo estrella para directivos. Los reportes generados viajan aquí para su aprobación.
- **Firma Digital Estampada:** El sistema lee el cargo oficial del usuario en sesión y, con un clic, estampa un sello visual impecable directamente sobre el texto de elaboración/aprobación del PDF original.
- **Soporte híbrido:** Permite tanto firma digital automática como la opción de subir un documento firmado a mano.
- **Control Visual:** Iconografía clara (Ojo verde) para identificar rápidamente qué documentos ya completaron su ciclo legal.

### 2.5. Configuración y Auditoría
*(Insertar captura de pantalla de Configuración mostrando el Historial)*
`![Configuración e Historial](./capturas/configuracion.png)`

Un entorno adaptado al usuario moderno:
- **Modo Oscuro/Claro** para reducir la fatiga visual.
- **Gestión de Perfil:** Personalización de nombres, correos y el **Cargo Oficial** que se utilizará legalmente en la firma digital.
- **Historial de Actividad (Auditoría):** Un registro inmutable donde los administradores pueden ver quién registró un ingreso, quién editó su perfil y a qué hora exacta, garantizando transparencia total.

### 2.6. Módulo de Administración de Usuarios y Directorio
*(Insertar capturas de Gestión de Usuarios y Directorio Consular)*
`![Usuarios](./capturas/usuarios.png)`
`![Directorio](./capturas/directorio.png)`

Otorgan control total a la institución:
- **Catálogo de Procedencias:** Gestión dinámica de más de 90 embajadas y consulados alrededor del mundo.
- **Control de Acceso:** Creación y suspensión de cuentas de usuario, y asignación de niveles de privilegio en el sistema.

---

## 3. Especificaciones Tecnológicas (Para el Cliente TI)

El SIC no solo es visualmente atractivo, sino que está construido sobre un stack tecnológico empresarial diseñado para durar:

- **Frontend:** `Next.js 16` con `React 19`. Arquitectura de "Server Components" que asegura una carga ultrarrápida (SPA) y nulo parpadeo entre pantallas.
- **Diseño UI:** `Tailwind CSS v4` para un diseño a medida, limpio y altamente escalable sin depender de plantillas pesadas.
- **Backend & APIs:** Totalmente integrado (Fullstack). Utiliza Route Handlers RESTful seguros bajo el mismo entorno.
- **Motor de PDF:** Generación en el servidor mediante algoritmos matemáticos precisos con `jsPDF` y firma inyectada a nivel binario con `pdf-lib`.
- **Base de Datos:** Persistencia ORM mediante `Prisma`, compatible con despliegues locales (SQLite) o migrable fácilmente a PostgreSQL/SQLServer en centros de datos gubernamentales.

---

**Desarrollado para transformar la gestión financiera consular.**
