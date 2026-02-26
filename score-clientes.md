1. Reglas de Acumulación de Score
  El sistema sumará puntos automáticamente cada vez que una Orden de
  Servicio cambie su estado a LIQUIDADO:


   * Servicio Finalizado: +10 puntos por cada orden liquidada con éxito.
   * Bonificación por Ticket: +5 puntos adicionales si el valor del
     servicio supera un umbral (ej. > $1.000.000 COP).
   * Fidelidad: +20 puntos si el cliente completa 5 servicios en menos
     de 6 meses.

  2. Umbrales de Clasificación
  Basado en el acumulado de puntos, el cliente se moverá entre niveles:


   * BRONCE: 0 - 100 puntos (Clientes nuevos o esporádicos).
   * PLATA: 101 - 500 puntos (Clientes recurrentes con historial
     sólido).
   * ORO: 501+ puntos (Clientes VIP/Estratégicos con alta facturación).


  3. La Excepción: Categoría RIESGO (Prioridad Máxima)
  Esta categoría anula los puntos y se activa por comportamiento o
  condiciones técnicas:


   * Riesgo Técnico: Si la última orden de servicio registra un "Nivel
     de Infestación" CRÍTICO o ALTO, el cliente se clasifica
     automáticamente como RIESGO para alertar a coordinación, sin
     importar si tiene 1000 puntos.
   * Riesgo Comercial: Si el cliente tiene una "Frecuencia Sugerida" de
     30 días y han pasado 45 días sin agendar, el sistema lo baja a
     RIESGO (Alerta de pérdida de cliente).


  4. Implementación Técnica
  Lo manejaríamos en el Backend (NestJS) mediante un "Hook" o lógica en
  el servicio de OrdenesServicio. Al momento de liquidar:
   1. Se calcula el nuevo score del cliente.
   2. Se evalúan las condiciones de riesgo.
   3. Se actualiza el campo clasificacion en la tabla Cliente.
