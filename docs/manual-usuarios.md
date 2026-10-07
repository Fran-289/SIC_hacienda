# Manual de Usuario - SIC Hacienda

Bienvenido al **Sistema de Ingresos Consulares (SIC) - Hacienda**. Este manual está diseñado para guiar a los usuarios a través de las diferentes funcionalidades del sistema, enfocándose estrictamente en el uso de la interfaz, sin detalles técnicos.

---

## 1. Acceso al Sistema

Para ingresar al sistema, diríjase a la URL proporcionada por su administrador.
1. Ingrese su **Correo Electrónico** institucional.
2. Ingrese su **Contraseña**.
3. Haga clic en el botón **Ingresar**.

> **Nota:** Si olvidó su contraseña, debe contactar a su administrador del sistema.

---

## 2. Navegación Principal

Una vez iniciada la sesión, verá un menú lateral a la izquierda. Dependiendo de sus permisos, verá algunas o todas las siguientes opciones:

*   **Bandeja de Ingresos:** Para el registro y control diario de ingresos consulares.
*   **Bandeja de Reportes:** Historial de informes de caja generados.
*   **Tareas Pendientes:** Flujo de aprobación y firma digital de reportes.
*   **Directorio Consular:** Catálogo de embajadas y consulados (si tiene el permiso asignado).
*   **Usuarios:** Gestión de cuentas de acceso (Sólo administradores).
*   **Configuración:** Preferencias de su cuenta y tema visual.

---

## 3. Bandeja de Ingresos

Este es el módulo principal donde se registran los ingresos diarios.

### Registrar un Nuevo Ingreso
1. Haga clic en el botón **"Registrar Ingreso"** (esquina superior derecha).
2. Complete el formulario con los siguientes datos:
   *   **Fecha de Depósito** y **Monto de Depósito.**
   *   **Fecha de Concentración** y **Días de Concentración** (calculados automáticamente al elegir la fecha).
   *   **Región, País y Embajada/Consulado:** procedencia del ingreso.
   *   **Desglose:** valores de Pasaporte, DUI, Consular, Comisión y Diversos. El total debe coincidir con el monto depositado.
   *   **Estado:** ver la sección siguiente.
3. Haga clic en **Guardar**.

### Estados de un Ingreso
*   **NO IDENTIFICADO:** Recién registrado o aún sin clasificar; se puede editar o eliminar.
*   **IDENTIFICADO NO DISTRIBUIDO:** Se conoce su procedencia, pero aún no se ha repartido entre los rubros.
*   **IDENTIFICADO DISTRIBUIDO:** Depósito repartido entre los rubros correspondientes.
*   Un ingreso vinculado a un **Informe de Caja en estado DEFINITIVO** queda bloqueado y *no puede ser modificado*.

---

## 4. Gestión de Reportes

### Generar Nuevos Reportes
Para crear informes de caja consolidados:
1. Navegue a **Bandeja de Reportes** y haga clic en **"Generar Reportes"**.
2. Seleccione el **Grupo de Reportes**:
   *   **Reportes Consulares:** genera Transferencias Cablegráficas, Liquidación de Fondos, Control de Saldos e Informe de Caja.
   *   **No Identificados / No Distribuidos:** genera el reporte mensual de valores pendientes.
3. Elija **Mes**, **Año**, la **Cuenta Bancaria** y el **Estado** (`PRELIMINAR`, `DEFINITIVO` o `DEFINITIVO MODIFICADO`; sólo un administrador puede marcar `DEFINITIVO`).
4. El sistema agrupará automáticamente los ingresos correspondientes y generará un paquete de documentos (PDF y Excel), que aparece en **Tareas Pendientes**.

### Tareas Pendientes (Firma Digital)
Los reportes generados pasan a una bandeja de aprobación con este flujo:
`Firma Jefatura` → `Modificación` → `Firma Recaudaciones` → `Finalizado`.

1. Navegue a **Tareas Pendientes**.
2. El botón **Siguiente** de cada fila avanza el grupo al estado siguiente del flujo.
3. Despliegue el grupo de reportes haciendo clic en la flecha de la fila.
4. En la columna de acciones, verá los siguientes iconos:
   *   **Ojo Gris:** Vista previa del reporte original.
   *   **Pluma:** Presione este botón para aplicar su **Firma Digital Automática**. El sistema estampará su nombre y cargo sobre el documento.
   *   **Nube (Subir):** Si prefiere firmar a mano, imprima el reporte, fírmelo, escanéelo y súbalo con este botón.
   *   **Ojo Verde:** Aparece cuando el documento ya está firmado. Haga clic para ver el documento oficial completado.
   *   **Descargas:** PDF y Excel del reporte.
5. En los documentos **No Identificados** encontrará además:
   *   **Enviar (icono de avión):** envía el reporte por correo desde el servidor, con el PDF adjunto, a Relaciones Exteriores y al Banco Cuscatlán.
   *   **Sobre (2 botones):** abre su correo (Gmail) con el mensaje ya redactado para enviarlo manualmente con el archivo adjunto.

---

## 5. Directorio Consular
Permite gestionar la lista de embajadas y consulados de los que se reciben ingresos (90 sedes).
1. Haga clic en **Nuevo Consulado** para añadir una sede.
2. Especifique el Tipo (Embajada/Consulado), País, Ubicación exacta y Dirección.
3. Puede buscar, editar, marcar una sede como **INACTIVA** y exportar el listado.
> Sólo los usuarios con permiso de **Directorio** (y los administradores) pueden crear o editar.

---

## 6. Módulo de Usuarios (Administradores)
Permite gestionar quién tiene acceso al sistema.
1. Haga clic en **Nuevo Usuario**.
2. Asigne el nombre, correo electrónico, una contraseña segura y seleccione el Nivel de Acceso (Administrador o Usuario regular).

---

## 7. Configuración
1. En esta pantalla puede editar su **Nombre** y **Cargo Oficial** (este cargo es el que aparecerá en su Firma Digital, por ejemplo: *Técnico de Concentraciones*).
2. También puede alternar el tema visual entre **Modo Claro** y **Modo Oscuro** según su preferencia de lectura.
3. Para salir del sistema de forma segura, haga clic en el botón de su perfil en la parte inferior izquierda y seleccione **Cerrar Sesión**.

### Opciones de Administrador
Si su rol es **Administrador**, la pantalla muestra además:
*   **Logos de Documentos:** imagen izquierda (M. Hacienda) y derecha (Gobierno) que encabezan los PDF.
*   **Firma de Aprobación:** nombre y cargo del aprobador que se estampa en los informes.
*   **Información Bancaria y Códigos Presupuestarios** utilizados en el Informe de Caja.
*   **Notificaciones por Correo:** destinatarios de RREE y Banco Cuscatlán (Para / Con copia).
*   **Historial de Actividad:** auditoría de los últimos movimientos del sistema.
