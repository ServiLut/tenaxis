  1. Capa de Identidad (¿Quién eres?)
   * `User`: Es tu "DNI" global. Solo contiene tu correo, contraseña y datos
     personales.
       * Cambio: Deja de tener roles o IDs de empresa. Un usuario es solo
         una persona que puede trabajar en uno o varios conglomerados.


  2. Capa de Conglomerado (El Dueño del Negocio)
   * `Tenant`: Es el Conglomerado (ej: "Grupo Inmobiliario Tenaxis"). Es la
     entidad que paga la suscripción al SaaS.
   * `Plan`: Define las reglas del juego para ese Tenant.
       * Ejemplo: El "Plan Básico" permite máximo 2 empresas y 10 usuarios.
         El "Plan Pro" permite empresas ilimitadas.
   * `Subscription`: Es el contrato activo. Une al Tenant con un Plan y dice
     hasta cuándo está pagado.


  3. Capa de Membresía (¿Qué puedes hacer y dónde?)
  Aquí es donde se resuelve tu duda del "botón de cambio":


   * `TenantMembership`: Es tu entrada al Conglomerado.
       * Si tu rol aquí es `SU_ADMIN`, eres el dueño. Tienes un "pase
         total". No necesitas estar en cada empresa individualmente; el
         sistema sabe que si eres SU_ADMIN del Tenant, puedes ver todo lo
         que haya abajo.
   * `EmpresaMembership`: Es tu "llave" para una oficina específica.
       * El botón de cambio: Cuando un usuario inicia sesión, el sistema
         busca cuántos registros tiene en esta tabla. Si tiene 3 registros
         (Sede Bogotá, Sede Medellín, Sede Cali), el frontend le muestra el
         selector. Al elegir una, el empresaId se envía en cada petición a
         la API para filtrar los datos.


  4. Capa Operativa (El día a día)
   * `Empresa`: Son las sedes o razones sociales bajo el conglomerado.
   * `Zona`: Subdivisión geográfica dentro de una empresa (ej: "Zona Norte",
     "Barrio Chapinero").
       * Los Asesores y Coordinadores se vinculan a un EmpresaMembership que
         tiene un zonaId específico.


  5. Capa de Jerarquía y Dinero (Comisiones)
   * `OrganizationNode`: Esta tabla crea el árbol de "quién depende de
     quién".
       * Aquí es donde dices: "El Asesor Juan depende del Coordinador
         Pedro".
       * Es una estructura de Padre e Hijo.
   * `CommissionRecord`: Cuando el Asesor Juan cierra un servicio, el
     sistema mira el OrganizationNode, ve que su "Padre" es Pedro, y genera
     automáticamente un registro de comisión para Pedro basándose en el
     porcentaje configurado.

  ---

  Resumen del flujo para tus roles:


   1. SU_ADMIN: El sistema mira su TenantMembership. Como es el jefe del
      conglomerado, la API le permite hacer findMany de todas las empresas.
   2. ADMIN: El sistema mira sus EmpresaMembership. Solo puede elegir entre
      las empresas donde tiene una "llave".
   3. COORDINADOR: Similar al Admin, pero en su EmpresaMembership tiene
      permisos limitados y en el OrganizationNode aparece como "Padre" de
      varios Asesores.
   4. ASESOR: Su EmpresaMembership está amarrado a una Zona. Solo ve
      servicios de esa zona.
   5. OPERADOR: Su EmpresaMembership solo le da permiso para el módulo de
      tareas asignadas, sin ver finanzas ni otros técnicos.
