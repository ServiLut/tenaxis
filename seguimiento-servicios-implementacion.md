# Seguimiento obligatorio de servicios

## Qué problema resuelve esto

Antes un asesor podía seguir creando y asignando servicios aunque tuviera seguimientos pendientes de servicios anteriores.

Ahora el sistema hace esto:

- Si un servicio sin contrato requiere seguimiento, el sistema crea recordatorios automáticos.
- Si esos seguimientos se vencen y el asesor no registra la llamada, el sistema lo bloquea.
- Mientras esté bloqueado, no puede crear ni asignar más servicios.
- `ADMIN` y `SU_ADMIN` pueden dar un desbloqueo temporal.

La idea es obligar a que el seguimiento realmente se haga y no se quede solo en promesa.

---

## Qué ve el usuario

### 1. Cuando crea una nueva orden de servicio

Pantalla afectada:

- `apps/web/app/dashboard/servicios/nuevo/page.tsx`

El usuario entra a "Nueva Orden de Servicio" como siempre.

Pero ahora, antes de guardar, la pantalla consulta al backend si ese usuario tiene seguimientos vencidos.

Pueden pasar 2 cosas:

### Caso A: no tiene seguimientos vencidos

- La pantalla funciona normal.
- El botón `Generar y Asignar` sigue habilitado.
- Puede crear el servicio.

### Caso B: sí tiene seguimientos vencidos

- Aparece una alerta arriba del formulario.
- La alerta explica que tiene seguimientos vencidos de servicios creados por él.
- Se muestran ejemplos de esos seguimientos.
- El botón principal queda deshabilitado.

En palabras simples:

"Hasta que no hagas las llamadas pendientes, no puedes crear más servicios".

### Caso C: tiene un desbloqueo temporal

- También aparece una alerta.
- La alerta indica que el usuario está temporalmente desbloqueado.
- Muestra hasta qué fecha y hora dura ese permiso.
- Mientras el permiso esté vigente, sí puede seguir creando servicios.

---

## Cómo funciona la regla de negocio

### Servicios sin contrato

Cuando un servicio está configurado para requerir seguimiento, se crean automáticamente:

- Un seguimiento inicial entre 8 y 15 días.
- Un seguimiento de 3 meses.

Eso depende de la configuración del `Servicio`.

Importante:

- `Tipo de Servicio` no decide esta regla.
- `Servicio` sí decide esta regla.

Esto es así porque:

- `Tipo de Servicio` clasifica la visita: nuevo, revisión, garantía, etc.
- `Servicio` representa lo que realmente se ofrece al cliente.

### Servicios con contrato

En esta implementación, los servicios que vienen como contrato se excluyen del bloqueo automático usando `tipoFacturacion`.

O sea:

- Si la orden es `UNICO`, sí aplica seguimiento automático.
- Si la orden es parte de contrato o plan, no se generan estos seguimientos fijos de 8-15 días y 3 meses.

Esto se dejó así porque hoy todavía no existe una entidad operativa de contrato conectada a la orden para generar el calendario real de visitas.

---

## Cómo sabe el sistema si debe bloquear

El backend revisa:

- quién es el usuario autenticado
- cuál es su `membershipId`
- en qué empresa está creando la orden
- si tiene seguimientos vencidos creados por él mismo
- si tiene un permiso temporal activo

Si encuentra seguimientos vencidos y no hay permiso temporal:

- lanza error
- no crea la orden

Esto es importante:

- el bloqueo no depende solo del frontend
- el backend también lo valida

Eso evita que alguien salte la restricción manipulando el navegador.

---

## Qué pasa cuando se crea una orden

Archivo principal:

- `apps/api/src/ordenes-servicio/ordenes-servicio.service.ts`

Flujo simple:

1. El backend valida la empresa.
2. Resuelve dirección y fechas.
3. Busca o crea el `Servicio`.
4. Revisa si el usuario puede seguir asignando servicios.
5. Crea la orden.
6. Si aplica, crea los seguimientos automáticos.
7. Devuelve la orden creada.

O sea:

Primero se valida el bloqueo, después se crea la orden, y luego se crean los seguimientos.

---

## Qué es un seguimiento en esta implementación

Se creó una tabla nueva para guardar seguimientos por orden:

- `ordenes_servicio_seguimientos`

Cada seguimiento guarda cosas como:

- a qué tenant pertenece
- a qué empresa pertenece
- a qué orden pertenece
- quién creó la orden
- qué tipo de seguimiento es
- cuándo se vence
- si ya fue completado
- cómo fue la llamada
- cuál fue el resultado
- notas

En palabras sencillas:

Un seguimiento ya no es una idea suelta ni una sugerencia genérica.
Ahora es un registro real y trazable, conectado a una orden de servicio concreta.

---

## Qué pasa cuando el usuario completa un seguimiento

Nuevo endpoint:

- `POST /ordenes-servicio/follow-ups/:id/complete`

Para completar un seguimiento, el usuario debe enviar:

- fecha y hora del contacto
- canal
- resultado
- notas

No basta con marcarlo como "listo".

La idea es que quede evidencia mínima de la llamada.

Si además envía una próxima acción, el sistema puede crear un seguimiento adicional.

---

## Cómo funciona el desbloqueo temporal

No se creó una tabla nueva para esto.
Se reutilizó la tabla existente `Permiso`.

Se añadió un nuevo tipo de permiso:

- `DESBLOQUEO_ASIGNACION_SERVICIOS`

Eso significa que el desbloqueo temporal es tratado como un permiso aprobado por un admin.

Qué guarda ese permiso:

- a quién se le da
- quién lo aprobó
- cuándo empieza
- cuándo vence
- motivo

Regla:

- solo `ADMIN` y `SU_ADMIN` pueden crearlo
- mientras esté vigente, el usuario puede seguir creando servicios
- cuando vence, el bloqueo vuelve automáticamente si siguen existiendo seguimientos vencidos

---

## Qué cambió en la base de datos

Archivo principal:

- `apps/api/prisma/schema.prisma`

Migración:

- `apps/api/prisma/migrations/20260309150000_service_follow_up_blocking/migration.sql`

Cambios importantes:

### En `Servicio`

Se agregaron estos campos:

- `requiereSeguimiento`
- `primerSeguimientoDias`
- `requiereSeguimientoTresMeses`

Eso permite decir:

- si este servicio necesita seguimiento
- cuántos días después se hace el primero
- si además debe existir el de 3 meses

### Nueva tabla

Se agregó:

- `OrdenServicioSeguimiento`

### Nuevo tipo de permiso

Se agregó a `TipoPermiso`:

- `DESBLOQUEO_ASIGNACION_SERVICIOS`

---

## Qué cambió en el backend

### 1. DTOs de configuración de servicio

Archivo:

- `apps/api/src/config-clientes/dto/servicio.dto.ts`

Ahora el backend acepta configurar si un servicio requiere seguimiento y cuántos días usa para el primer seguimiento.

También valida que:

- si `requiereSeguimiento = true`
- entonces `primerSeguimientoDias` sea obligatorio

### 2. Lógica de configuración

Archivo:

- `apps/api/src/config-clientes/config-clientes.service.ts`

Aquí se agregó la validación de la configuración del servicio.

### 3. Nuevos DTOs de seguimiento

Archivos:

- `apps/api/src/ordenes-servicio/dto/complete-follow-up.dto.ts`
- `apps/api/src/ordenes-servicio/dto/create-follow-up-override.dto.ts`

Sirven para validar:

- completar seguimientos
- crear desbloqueos temporales

### 4. Nuevos endpoints

Archivo:

- `apps/api/src/ordenes-servicio/ordenes-servicio.controller.ts`

Se agregaron endpoints para:

- consultar el estado de bloqueo del usuario
- completar un seguimiento
- listar desbloqueos
- crear desbloqueos

### 5. Lógica principal

Archivo:

- `apps/api/src/ordenes-servicio/ordenes-servicio.service.ts`

Aquí vive casi todo lo importante:

- la validación de bloqueo
- la búsqueda de permisos temporales activos
- la creación automática de seguimientos
- la finalización de seguimientos
- la creación del desbloqueo temporal

---

## Qué cambió en el frontend

### 1. Página de nueva orden

Archivo:

- `apps/web/app/dashboard/servicios/nuevo/page.tsx`

Se cambió para:

- consultar el estado de seguimientos del usuario
- mostrar alerta si está bloqueado
- deshabilitar el botón de creación
- usar llamada HTTP directa para crear la orden

### 2. Cliente API de servicios para el frontend

Archivo:

- `apps/web/app/dashboard/servicios/api.ts`

Se agregaron funciones para:

- crear la orden por HTTP
- consultar el estado de bloqueo del usuario

### 3. Tipos frontend del catálogo

Archivo:

- `apps/web/app/dashboard/actions.ts`

Se actualizó el tipo `ServicioDTO` para soportar los nuevos campos de seguimiento.

### 4. Ajuste menor para que compilara web

Archivo:

- `apps/web/app/dashboard/servicios/[id]/editar/page.tsx`

Se corrigió un tipo que estaba desactualizado y rompía el build.

Este cambio no altera la lógica del seguimiento.
Solo evitó un error de compilación.

---

## Qué archivos fueron afectados

### Backend

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260309150000_service_follow_up_blocking/migration.sql`
- `apps/api/src/config-clientes/dto/servicio.dto.ts`
- `apps/api/src/config-clientes/config-clientes.service.ts`
- `apps/api/src/ordenes-servicio/dto/complete-follow-up.dto.ts`
- `apps/api/src/ordenes-servicio/dto/create-follow-up-override.dto.ts`
- `apps/api/src/ordenes-servicio/ordenes-servicio.controller.ts`
- `apps/api/src/ordenes-servicio/ordenes-servicio.service.ts`
- archivos regenerados de Prisma en `apps/api/src/generated/client/*`

### Frontend

- `apps/web/app/dashboard/servicios/nuevo/page.tsx`
- `apps/web/app/dashboard/servicios/api.ts`
- `apps/web/app/dashboard/actions.ts`
- `apps/web/app/dashboard/servicios/[id]/editar/page.tsx`

---

## Ejemplo simple del flujo completo

### Ejemplo 1: servicio normal sin contrato

1. El asesor crea una orden.
2. El servicio tiene configurado seguimiento.
3. El sistema crea:
   - seguimiento inicial
   - seguimiento a 3 meses
4. Pasan los días.
5. El asesor no registra la llamada.
6. El seguimiento se vence.
7. El asesor intenta crear otra orden.
8. El backend y el frontend lo bloquean.

Resultado:

No puede seguir asignando hasta completar el seguimiento.

### Ejemplo 2: admin da permiso temporal

1. El asesor sigue bloqueado.
2. Un `ADMIN` le da permiso temporal.
3. Durante esa ventana, el asesor sí puede crear órdenes.
4. El permiso se vence.
5. Si todavía hay seguimientos vencidos, el bloqueo regresa.

---

## Qué cosas todavía no hace esta implementación

Es importante que los juniors entiendan esto para no asumir cosas que aún no existen.

### 1. No hay una pantalla admin completa para gestionar desbloqueos

El backend ya lo soporta.
Pero todavía no se construyó una UI dedicada para admins.

### 2. No existe todavía el calendario real de contratos

Hoy los servicios de contrato se excluyen usando `tipoFacturacion`.

Más adelante, cuando exista una entidad operativa real de contrato:

- con fecha inicio
- fecha fin
- frecuencia
- vigencia

entonces el sistema podrá generar seguimientos periódicos reales para contratos.

---

## Resumen corto para juniors

Si quieres explicarlo en una sola frase:

> Ahora el sistema obliga a hacer seguimiento telefónico a ciertos servicios antes de permitir crear más órdenes.

Si quieres explicarlo en tres ideas:

1. `Servicio` define si hay seguimiento y cuándo vence.
2. `OrdenServicioSeguimiento` guarda cada seguimiento real.
3. Si el asesor tiene seguimientos vencidos, se bloquea la creación de nuevas órdenes, salvo que un admin le dé permiso temporal.

---

## Recomendación para quien continúe este desarrollo

El siguiente paso natural sería:

1. crear una pantalla para que `ADMIN` y `SU_ADMIN` otorguen desbloqueos temporales
2. crear una vista de seguimientos pendientes para asesores
3. conectar el futuro modelo de contrato real para generar seguimientos recurrentes correctamente

