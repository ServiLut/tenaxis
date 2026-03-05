export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
  message?: string;
}

export interface User {
  nombre: string;
  apellido: string;
}

export interface Membership {
  id: string;
  username: string;
  role: string;
  user: User;
}

export interface Session {
  id: string;
  fechaInicio: string;
  fechaFin: string | null;
  tiempoInactivo: number;
  membershipId: string;
  membership: Membership;
  logs: Log[];
  updatedAt: string;
  ip: string;
  dispositivo: string;
}

export interface Log {
  id: string;
  tipo: string;
  descripcion: string;
  ruta?: string;
  createdAt: string;
  sesionId: string;
  sesion: {
    ip: string;
    dispositivo: string;
    membership: Membership;
  };
}

export interface Audit {
  id: string;
  entidad: string;
  entidadId: string;
  accion: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  membershipId: string;
  membership: Membership;
  detalles: {
    anterior?: unknown;
    nuevo?: unknown;
  };
}

export interface MonitoringStats {
  totalEvents: number;
  activeSessions: number;
  totalInactivity: number;
}

export interface MonitoringAlert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  severity: 'alta' | 'media' | 'baja';
}

export interface MonitoringMetrics {
  avgActiveTimeMin: number;
  totalInactivityMin: number;
  topInactivity: { name: string; minutes: number }[];
  mttfeSec: number;
  userCount: number;
}

export interface ExecutiveAuditMetrics {
  today: { created: number; updated: number; deleted: number; total: number };
  week: { created: number; updated: number; deleted: number; total: number };
  topEntities: { name: string; count: number }[];
  topUsers: { name: string; count: number }[];
  successRate: number;
}
