import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import {
  Cliente,
  ClasificacionCliente,
  SegmentoCliente,
  NivelRiesgo,
  Prisma,
} from '../generated/client/client';

type ClienteWithRelations = Cliente & {
  direcciones?: any[];
  vehiculos?: any[];
  configuracionesOperativas?: any[];
  ordenesServicio?: any[];
  empresa?: any;
  tenant?: any;
  tipoInteres?: any;
};

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  private buildSegmentedFromClients(clients: ClienteWithRelations[]) {
    const tickets = clients
      .map((c) => Number(c.ticketPromedio))
      .filter((t) => !isNaN(t) && t > 0)
      .sort((a, b) => a - b);

    let median = 0;
    if (tickets.length > 0) {
      const mid = Math.floor(tickets.length / 2);
      median =
        tickets.length % 2 !== 0
          ? tickets[mid]
          : (tickets[mid - 1] + (tickets[mid] ?? 0)) / 2;
    }

    const now = new Date();
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(now.getDate() - 60);

    const segmented = {
      riesgoFuga: [] as ClienteWithRelations[],
      upsellPotencial: [] as ClienteWithRelations[],
      dormidos: [] as ClienteWithRelations[],
      operacionEstable: [] as ClienteWithRelations[],
    };

    clients.forEach((client) => {
      const riesgoNombre = String(client.nivelRiesgo || '').toUpperCase();
      const isRiesgoFuga =
        riesgoNombre.includes('ALTO') ||
        riesgoNombre.includes('CRITICO') ||
        riesgoNombre.includes('CRÍTICO') ||
        (client.proximaVisita && new Date(client.proximaVisita) < now);

      if (isRiesgoFuga) {
        segmented.riesgoFuga.push(client);
        return;
      }

      const isUpsell =
        (client.clasificacion === ClasificacionCliente.ORO ||
          client.clasificacion === ClasificacionCliente.PLATA) &&
        Number(client.ticketPromedio || 0) > median;

      if (isUpsell) {
        segmented.upsellPotencial.push(client);
        return;
      }

      const lastVisit = client.ultimaVisita
        ? new Date(client.ultimaVisita)
        : new Date(client.createdAt);
      const isDormido = lastVisit < sixtyDaysAgo;

      if (isDormido) {
        segmented.dormidos.push(client);
        return;
      }

      segmented.operacionEstable.push(client);
    });

    return {
      riesgoFuga: {
        count: segmented.riesgoFuga.length,
        data: segmented.riesgoFuga as Cliente[],
      },
      upsellPotencial: {
        count: segmented.upsellPotencial.length,
        data: segmented.upsellPotencial as Cliente[],
      },
      dormidos: {
        count: segmented.dormidos.length,
        data: segmented.dormidos as Cliente[],
      },
      operacionEstable: {
        count: segmented.operacionEstable.length,
        data: segmented.operacionEstable as Cliente[],
      },
    };
  }

  async findAll(
    tenantId: string,
    empresaId?: string,
    userRole?: string,
  ): Promise<Cliente[]> {
    const include: Prisma.ClienteInclude = {
      direcciones: {
        include: { municipioRel: true },
      },
      vehiculos: true,
      tipoInteres: true,
      tenant: userRole === 'SU_ADMIN',
      empresa: true,
      configuracionesOperativas: {
        where: {
          ...(empresaId && { empresaId }),
        },
      },
      ordenesServicio: {
        where: {
          ...(empresaId && { empresaId }),
          estadoPago: { not: 'PAGADO' },
        },
        select: {
          id: true,
          estadoPago: true,
          valorCotizado: true,
          valorPagado: true,
          valorRepuestos: true,
        },
      },
    };

    let clients: Cliente[] = [];

    if (userRole === 'SU_ADMIN') {
      clients = await this.prisma.cliente.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        include,
      });
    } else {
      clients = await this.prisma.cliente.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(empresaId && { empresaId }),
        },
        orderBy: { createdAt: 'desc' },
        include,
      });
    }

    // Apply "Riesgo Comercial" logic in response (more than 45 days since last visit or 1.5x frequency)
    const now = new Date();
    const result: Cliente[] = clients.map((client: Cliente): Cliente => {
      // If already RIESGO from DB (e.g. Technical Risk), keep it
      if (client.clasificacion === ClasificacionCliente.RIESGO) {
        return client;
      }

      const lastVisit = client.ultimaVisita
        ? new Date(client.ultimaVisita)
        : null;

      if (lastVisit) {
        const diffDays =
          (now.getTime() - lastVisit.getTime()) / (1000 * 3600 * 24);

        // Frecuencia sugerida: prefer client's own frequency, then default 30
        const frequency = client.frecuenciaServicio || 30;

        const isCommercialRisk =
          diffDays > (frequency === 30 ? 45 : frequency * 1.5);

        if (isCommercialRisk) {
          return {
            ...client,
            clasificacion: ClasificacionCliente.RIESGO,
          } as Cliente;
        }
      }
      return client;
    });
    return result;
  }

  async getSegmented(tenantId: string, empresaId?: string) {
    const clients = await this.prisma.cliente.findMany({
      where: {
        tenantId,
        ...(empresaId && { empresaId }),
        deletedAt: null,
      },
      include: {
        direcciones: {
          include: { municipioRel: true },
        },
        vehiculos: true,
        tipoInteres: true,
        configuracionesOperativas: {
          where: {
            ...(empresaId && { empresaId }),
          },
        },
        ordenesServicio: {
          where: {
            ...(empresaId && { empresaId }),
            estadoPago: { not: 'PAGADO' },
          },
          select: {
            id: true,
            estadoPago: true,
            valorCotizado: true,
            valorPagado: true,
            valorRepuestos: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.buildSegmentedFromClients(clients as ClienteWithRelations[]);
  }

  async getDashboardData(
    tenantId: string,
    empresaId?: string,
    userRole?: string,
  ) {
    const clientes = await this.findAll(tenantId, empresaId, userRole);
    const segmentacion = this.buildSegmentedFromClients(
      clientes as ClienteWithRelations[],
    );

    return {
      clientes,
      segmentacion,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateClienteDto,
    reqEmpresaId?: string,
  ): Promise<Cliente> {
    const { direcciones, vehiculos, metrajeTotal, ...restDto } = dto;

    const membership = await this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { empresaMemberships: true },
    });

    if (!membership) {
      throw new UnauthorizedException(
        'No eres miembro de este tenant. No puedes crear clientes.',
      );
    }
    const empresaId =
      reqEmpresaId || membership?.empresaMemberships[0]?.empresaId;

    const toDecimal = (val: unknown, decimals: number = 2) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num.toFixed(decimals);
    };

    const orConditions: Prisma.ClienteWhereInput[] = [];
    if (
      restDto.numeroDocumento &&
      restDto.numeroDocumento !== 'No Concretado'
    ) {
      orConditions.push({ numeroDocumento: restDto.numeroDocumento });
    }
    if (restDto.nit && restDto.nit !== 'No Concretado') {
      orConditions.push({ nit: restDto.nit });
    }
    if (restDto.telefono && restDto.telefono !== 'No Concretado') {
      orConditions.push({ telefono: restDto.telefono });
    }

    if (orConditions.length > 0) {
      const existingClient = await this.prisma.cliente.findFirst({
        where: {
          tenantId,
          OR: orConditions,
          deletedAt: null,
        },
      });

      if (existingClient) {
        throw new ConflictException(
          'Ya existe un cliente con este número de documento, NIT o teléfono en el sistema.',
        );
      }
    }

    const data = {
      ...restDto,
      tenant: { connect: { id: tenantId } },
      ...(empresaId && { empresa: { connect: { id: empresaId } } }),
      segmento: restDto.segmento || SegmentoCliente.OTRO,
      nivelRiesgo: restDto.nivelRiesgo || NivelRiesgo.MEDIO,
      metrajeTotal: toDecimal(metrajeTotal, 2)
        ? new Prisma.Decimal(toDecimal(metrajeTotal, 2)!)
        : null,
      creadoPor: { connect: { id: membership.id } },

      direcciones: {
        create: direcciones?.map((d) => ({
          ...d,
          tenantId,
          ...(empresaId && { empresaId }),
          latitud: d.latitud ? Number(d.latitud) : null,
          longitud: d.longitud ? Number(d.longitud) : null,
          precisionGPS: toDecimal(d.precisionGPS, 2),
        })),
      },

      vehiculos: {
        create: vehiculos?.map((v) => ({
          ...v,
          tenantId,
          ...(empresaId && { empresaId }),
        })),
      },
    } as unknown as Prisma.ClienteCreateInput;

    try {
      return (await this.prisma.cliente.create({
        data,
        include: {
          direcciones: true,
          vehiculos: true,
          tipoInteres: true,
        },
      })) as Cliente;
    } catch (error) {
      console.error(
        'Error creating cliente. Data:',
        JSON.stringify(data, null, 2),
      );
      console.error('Prisma Error:', error);
      throw error;
    }
  }

  async findOne(id: string, tenantId: string): Promise<Cliente | null> {
    return this.prisma.cliente.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        direcciones: {
          include: { municipioRel: true },
        },
        vehiculos: true,
        tipoInteres: true,
      },
    });
  }

  async update(
    id: string,
    tenantId: string,
    userId: string,
    dto: Partial<CreateClienteDto>,
  ): Promise<Cliente> {
    void userId;
    const { direcciones, vehiculos, metrajeTotal, ...restDto } = dto;

    const toDecimal = (val: unknown, decimals: number = 2) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num.toFixed(decimals);
    };

    if (direcciones) {
      await this.prisma.direccion.deleteMany({ where: { clienteId: id } });
    }
    if (vehiculos) {
      await this.prisma.vehiculo.deleteMany({ where: { clienteId: id } });
    }

    const data = {
      ...restDto,
      metrajeTotal: toDecimal(metrajeTotal, 2)
        ? new Prisma.Decimal(toDecimal(metrajeTotal, 2)!)
        : undefined,

      direcciones: direcciones
        ? {
            create: direcciones.map((d) => ({
              ...d,
              tenantId,
              latitud: d.latitud ? Number(d.latitud) : null,
              longitud: d.longitud ? Number(d.longitud) : null,
              precisionGPS: toDecimal(d.precisionGPS, 2),
            })),
          }
        : undefined,

      vehiculos: vehiculos
        ? {
            create: vehiculos.map((v) => ({
              ...v,
              tenantId,
            })),
          }
        : undefined,
    } as unknown as Prisma.ClienteUpdateInput;

    return (await this.prisma.cliente.update({
      where: { id },
      data,
      include: {
        direcciones: true,
        vehiculos: true,
        tipoInteres: true,
      },
    })) as Cliente;
  }

  async remove(id: string, tenantId: string): Promise<Cliente> {
    return this.prisma.cliente.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    });
  }
}
