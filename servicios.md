# 📌 ASIGNACIÓN DE SERVICIOS  
## Arquitectura Operativa – Versión Elite

---

# 1️⃣ FLUJO CORRECTO DE CREACIÓN DE SERVICIO (Wizard)

---

## 🔹 PASO 1 – Cliente

- Cliente ya existente
- Dirección seleccionada (si tiene varias)

---

## 🔹 PASO 2 – Tipo de Servicio

Campos mínimos:

- Tipo de interés
- servicio a realizar
- Nivel de infestación (0–3)
- Urgencia

En este momento el sistema calcula automáticamente:

- SLA dinámico
- Nivel de riesgo
- Frecuencia sugerida
- Score operativo

---

## 🔹 PASO 3 – Asignación Inteligente

El sistema debe proponer automáticamente:

### A) Operador sugerido

Basado en:

- Zona asignada
- Carga actual
- Tiempo activo hoy
- Historial con el cliente
- Reincidencias anteriores

---

### B) Zona automática

Basado en:

- Barrio
- Municipio
- Agrupación geográfica
- Optimización de rutas

---

### C) Fecha recomendada

Basado en:

- SLA
- Disponibilidad operador
- Densidad por zona

---

# 2️⃣ MÉTODO DE PAGO Y ESTADO DE PAGO

Separar claramente operación de facturación.

---

## Pago esperado

- Efectivo
- Transferencia
- QR
- Crédito (empresas)
- Contrato mensual

---

## Estado de pago

- Pendiente
- Pagado
- Declarado (efectivo)
- Consignado
- Conciliado

---

⚠️ Regla crítica:

Si método = EFECTIVO:

- Exigir declaración
- Exigir evidencia
- Exigir consignación posterior

Conecta con módulo contable.

---

# 3️⃣ ESTADOS DEL SERVICIO

Estados obligatorios:

1. BORRADOR
2. ASIGNADO
3. EN_RUTA
4. EN_SITIO
5. EJECUTADO
6. CIERRE_PENDIENTE
7. CERRADO
8. NO_CONFORME

Permite:

- Medición real de tiempos
- Bloqueos técnicos
- Detección de abandono
- Auditoría

---

# 4️⃣ AUTOMATIZACIONES ACTIVADAS AL CREAR SERVICIO

✔ Crear tarea técnica  
✔ Bloquear horario del operador  
✔ Activar cronómetro SLA  
✔ Agendar recordatorio cliente  
✔ Calcular margen estimado  
✔ Registrar proyección de ingreso  

---

# 5️⃣ ASIGNACIÓN MULTINIVEL

Si el asesor pertenece a un coordinador:

- Registrar comisión automática
- Vincular al árbol jerárquico
- Calcular porcentaje correspondiente
- Generar registro de comisión

Todo invisible para el técnico.

---

# 6️⃣ BLOQUEOS OBLIGATORIOS

No permitir:

- Crear orden sin cliente completo
- Asignar operador sin zona
- Cerrar sin evidencias
- Cerrar sin nivel definido
- Cerrar sin recomendación
- Facturar con estado inválido

Disciplina estructural.

---

# 7️⃣ ARQUITECTURA OPERATIVA

Cliente  
→ Dirección  
→ Orden  
→ Operador  
→ SLA  
→ Pago  
→ Cierre  
 Comisión  →
→ Dashboard Ejecutivo

---
