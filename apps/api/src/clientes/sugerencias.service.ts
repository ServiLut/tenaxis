import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientesService } from '../clientes/clientes.service';
import { 
  EstadoSugerencia, 
  PrioridadSugerencia, 
  ClasificacionCliente 
} from '../generated/client';

@Injectable()
export class SugerenciasService {
  private readonly logger = new Logger(SugerenciasService.name);

  constructor(
    private prisma: PrismaService,
    private clientesService: ClientesService,
  ) {}

  async findAll(tenantId: string, empresaId?: string) {
    return this.prisma.sugerenciaSeguimiento.findMany({
      where: {
        tenantId,
        ...(empresaId && { empresaId }),
      },
      include: {
        cliente: true,
      },
      orderBy: [
        { prioridad: 'desc' },
        { creadoAt: 'desc' },
      ],
    });
  }

  async getQuickStats(tenantId: string, empresaId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sugerencias = await this.prisma.sugerenciaSeguimiento.findMany({
      where: {
        tenantId,
        ...(empresaId && { empresaId }),
      },
    });

    const pendientes = sugerencias.filter(s => s.estado === EstadoSugerencia.PENDIENTE);
    const aceptadas = sugerencias.filter(s => s.estado === EstadoSugerencia.ACEPTADA || s.estado === EstadoSugerencia.EJECUTADA);
    
    // Tasa de aceptación
    const totalProcessed = sugerencias.filter(s => s.estado !== EstadoSugerencia.PENDIENTE).length;
    const acceptanceRate = totalProcessed > 0 ? (aceptadas.length / totalProcessed) * 100 : 0;

    // Tiempo promedio hasta ejecución (en minutos)
    const ejecutadas = sugerencias.filter(s => s.estado === EstadoSugerencia.EJECUTADA && s.fechaEjecutada);
    const avgTimeToExecution = ejecutadas.length > 0
      ? ejecutadas.reduce((acc, s) => {
          const diff = s.fechaEjecutada.getTime() - s.creadoAt.getTime();
          return acc + (diff / (1000 * 60));
        }, 0) / ejecutadas.length
      : 0;

    return {
      pendientesPorPrioridad: {
        CRITICA: pendientes.filter(s => s.prioridad === PrioridadSugerencia.CRITICA).length,
        ALTA: pendientes.filter(s => s.prioridad === PrioridadSugerencia.ALTA).length,
        MEDIA: pendientes.filter(s => s.prioridad === PrioridadSugerencia.MEDIA).length,
        BAJA: pendientes.filter(s => s.prioridad === PrioridadSugerencia.BAJA).length,
      },
      tasaAceptacion: Number(acceptanceRate.toFixed(2)),
      tiempoPromedioEjecucionMin: Number(avgTimeToExecution.toFixed(2)),
      totalHoy: sugerencias.filter(s => s.creadoAt >= today).length,
    };
  }

  async updateEstado(id: string, tenantId: string, estado: EstadoSugerencia) {
    const data: any = { estado };
    if (estado === EstadoSugerencia.EJECUTADA) {
      data.fechaEjecutada = new Date();
    }

    return this.prisma.sugerenciaSeguimiento.update({
      where: { id, tenantId },
      data,
    });
  }

  // Job v1: Generación determinística diaria
  async generateDailySugerencias() {
    this.logger.log('Iniciando generación diaria de sugerencias...');
    
    // Obtenemos todos los tenants activos
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });

    for (const tenant of tenants) {
      try {
        const segmented = await this.clientesService.getSegmented(tenant.id);
        
        // 1. Riesgo de Fuga -> Prioridad CRITICA
        for (const client of segmented.riesgoFuga.data) {
          await this.createSugerenciaIfNotExists({
            tenantId: tenant.id,
            empresaId: client.empresaId,
            clienteId: client.id,
            tipo: 'PROGRAMAR_VISITA',
            prioridad: PrioridadSugerencia.CRITICA,
            titulo: 'Programar Visita Urgente',
            descripcion: `El cliente ${client.nombre || client.razonSocial} tiene riesgo alto o visita vencida.`,
          });
        }

        // 2. Dormidos -> Prioridad ALTA
        for (const client of segmented.dormidos.data) {
          await this.createSugerenciaIfNotExists({
            tenantId: tenant.id,
            empresaId: client.empresaId,
            clienteId: client.id,
            tipo: 'REACTIVAR',
            prioridad: PrioridadSugerencia.ALTA,
            titulo: 'Reactivar Cliente',
            descripcion: `Sin actividad en los últimos 60 días. Se recomienda contacto comercial.`,
          });
        }

        // 3. Upsell Potencial -> Prioridad MEDIA
        for (const client of segmented.upsellPotencial.data) {
          if (client.aceptaMarketing) {
            await this.createSugerenciaIfNotExists({
              tenantId: tenant.id,
              empresaId: client.empresaId,
              clienteId: client.id,
              tipo: 'UPSELL',
              prioridad: PrioridadSugerencia.MEDIA,
              titulo: 'Oferta Upsell',
              descripcion: `Ticket promedio superior a la media. Potencial para nuevos servicios.`,
            });
          }
        }

        // 4. Config Incompleta -> Prioridad BAJA
        const incompleteClients = await this.prisma.cliente.findMany({
          where: {
            tenantId: tenant.id,
            deletedAt: null,
            OR: [
              { direcciones: { none: {} } },
              { configuracionesOperativas: { none: {} } }
            ]
          }
        });

        for (const client of incompleteClients) {
          await this.createSugerenciaIfNotExists({
            tenantId: tenant.id,
            empresaId: client.empresaId,
            clienteId: client.id,
            tipo: 'COMPLETAR_CONFIG',
            prioridad: PrioridadSugerencia.BAJA,
            titulo: 'Completar Configuración',
            descripcion: `Faltan datos operativos críticos (sedes o protocolos).`,
          });
        }

      } catch (err) {
        this.logger.error(`Error procesando sugerencias para tenant ${tenant.id}: ${err.message}`);
      }
    }
    
    this.logger.log('Generación diaria finalizada.');
  }

  private async createSugerenciaIfNotExists(data: {
    tenantId: string;
    empresaId?: string;
    clienteId: string;
    tipo: string;
    prioridad: PrioridadSugerencia;
    titulo: string;
    descripcion: string;
  }) {
    // Evitar duplicados pendientes del mismo tipo para el mismo cliente
    const existing = await this.prisma.sugerenciaSeguimiento.findFirst({
      where: {
        clienteId: data.clienteId,
        tipo: data.tipo,
        estado: EstadoSugerencia.PENDIENTE,
      }
    });

    if (!existing) {
      await this.prisma.sugerenciaSeguimiento.create({
        data: {
          ...data,
          metadata: {},
        }
      });
    }
  }
}
