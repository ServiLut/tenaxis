# Checkpoint de conciliación — 2026-03-25

## Contexto
Sesión enfocada en blindar el flujo de conciliación de servicios contra error humano, mal uso y congelamientos prematuros.

## Cambios implementados
- Backend endurecido en `apps/api/src/ordenes-servicio/**` y `apps/api/src/contabilidad/**`.
- Se corrigió la lógica que convertía `desglosePago` en pago real automático.
- Transferencias ahora requieren evidencia mínima para confirmarse.
- El flujo de efectivo sigue pasando por recaudo/conciliación en contabilidad.
- Se corrigió un bug de URL duplicada en soportes de pago del modal de liquidación.
- Se añadió `financialLock` para que el frontend pueda bloquear visualmente órdenes ya congeladas.
- Se ajustó el frontend de servicios para tratar el desglose como **Plan de Cobro** y no como pago confirmado.

## Validaciones hechas
- Typecheck del API ejecutado con éxito.
- Tests focalizados del backend ejecutados con éxito.
- Se verificó que la transferencia pura ya no quede `PAGADO` sin evidencia.
- Se verificó que el modal de liquidación bloquee si falta soporte de transferencia.
- Se verificó que el recaudo de contabilidad depende de lo que backend expone.

## Flujo actual corregido
- Agendar y editar ahora se presentan como plan/condición de cobro.
- Transferencia no se puede cerrar sin comprobante, referencia y fecha.
- Efectivo sigue yendo por recaudo/consignación.
- El freeze financiero ya no debería dispararse por una simple intención de cobro.

## Pendientes
- Separar formalmente `planPago` vs `registroPago`.
- Terminar de desacoplar el flujo mixto para que el efectivo pendiente aparezca en recaudo aunque la transferencia siga pendiente o falle.
- Revisar anticipos para que también exijan evidencia de forma consistente.
- Cerrar el error preexistente de `contabilidad/page.tsx` relacionado con `tecnicoId` en `FormData`.

## Decisiones importantes
- `desglosePago` debe tratarse como condición de cobro, no como pago real confirmado.
- Transferencia sin evidencia no debe congelar ni cerrar la orden.
- El tab de recaudo de contabilidad depende del universo que backend devuelve; no descubre saldos por sí solo.
- ENGRAM no se sube directo a GitHub: el checkpoint se exporta a este archivo para versionarlo en el repo.
