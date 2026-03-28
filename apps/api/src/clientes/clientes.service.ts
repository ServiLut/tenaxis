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
  EstadoContratoCliente,
  SegmentoCliente,
  NivelRiesgo,
  Prisma,
} from '../generated/client/client';
import { startOfBogotaDayUtc } from '../common/utils/timezone.util';
import { JwtPayload } from '../auth/jwt-payload.interface';
import {
  getPrismaAccessFilter,
  PrismaAccessFilter,
} from '../common/utils/access-control.util';

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

  private buildEmpresaWhere(
    empresaFilter?: PrismaAccessFilter['empresaId'],
  ): PrismaAccessFilter['empresaId'] {
    return empresaFilter;
  }

  private buildClienteWhere(
    accessFilter: PrismaAccessFilter,
    extraWhere: Prisma.ClienteWhereInput = {},
  ): Prisma.ClienteWhereInput {
    const where: Prisma.ClienteWhereInput = {
      ...extraWhere,
      ...(accessFilter.tenantId ? { tenantId: accessFilter.tenantId } : {}),
      ...(accessFilter.empresaId ? { empresaId: accessFilter.empresaId } : {}),
    };

    if ((accessFilter.zonaIds || []).length > 0) {
      where.direcciones = {
        some: {
          zonaId: {
            in: accessFilter.zonaIds,
          },
        },
      };
    }

    return where;
  }

  private buildSegmentedFromClients(clients: ClienteWithRelations[]) {
    // ... rest of private method unchanged ...
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

    const now = startOfBogotaDayUtc(new Date());
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

  async findAll(user: JwtPayload, reqEmpresaId?: string): Promise<Cliente[]> {
    const accessFilter = getPrismaAccessFilter(user, reqEmpresaId);
    const empresaWhere = this.buildEmpresaWhere(accessFilter.empresaId);

    const include: Prisma.ClienteInclude = {
      direcciones: {
        include: { municipioRel: true },
      },
      vehiculos: true,
      tipoInteres: true,
      tenant: user.isGlobalSuAdmin,
      empresa: true,
      configuracionesOperativas: {
        where: {
          ...(empresaWhere ? { empresaId: empresaWhere } : {}),
        },
      },
      ordenesServicio: {
        where: {
          ...(empresaWhere ? { empresaId: empresaWhere } : {}),
          ...((accessFilter.zonaIds || []).length > 0
            ? {
                zonaId: {
                  in: accessFilter.zonaIds,
                },
              }
            : {}),
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

    const clients = await this.prisma.cliente.findMany({
      where: this.buildClienteWhere(accessFilter, { deletedAt: null }),
      orderBy: { createdAt: 'desc' },
      include,
    });

    // Apply "Riesgo Comercial" logic in response (more than 45 days since last visit or 1.5x frequency)
    const now = startOfBogotaDayUtc(new Date());
    const result: Cliente[] = clients.map(
      (client: ClienteWithRelations): Cliente => {
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
      },
    );
    return result;
  }

  async getSegmented(user: JwtPayload, reqEmpresaId?: string) {
    const accessFilter = getPrismaAccessFilter(user, reqEmpresaId);
    const empresaWhere = this.buildEmpresaWhere(accessFilter.empresaId);

    const clients = await this.prisma.cliente.findMany({
      where: this.buildClienteWhere(accessFilter, { deletedAt: null }),
      include: {
        direcciones: {
          include: { municipioRel: true },
        },
        vehiculos: true,
        tipoInteres: true,
        configuracionesOperativas: {
          where: {
            ...(empresaWhere ? { empresaId: empresaWhere } : {}),
          },
        },
        ordenesServicio: {
          where: {
            ...(empresaWhere ? { empresaId: empresaWhere } : {}),
            ...((accessFilter.zonaIds || []).length > 0
              ? {
                  zonaId: {
                    in: accessFilter.zonaIds,
                  },
                }
              : {}),
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

  async getDashboardData(user: JwtPayload, reqEmpresaId?: string) {
    const clientes = await this.findAll(user, reqEmpresaId);
    const segmentacion = this.buildSegmentedFromClients(
      clientes as ClienteWithRelations[],
    );

    return {
      clientes,
      segmentacion,
    };
  }

  async create(
    user: JwtPayload,
    dto: CreateClienteDto,
    reqEmpresaId?: string,
  ): Promise<Cliente> {
    const {
      direcciones,
      vehiculos,
      metrajeTotal,
      tipoInteresId,
      empresaId: _empresaId,
      ...restDto
    } = dto as CreateClienteDto & { empresaId?: string };

    void _empresaId;

    const accessFilter = getPrismaAccessFilter(user, reqEmpresaId);

    // Resolve the actual empresaId for creation.
    // If multiple are allowed, we use the first one or the requested one.
    let empresaId: string | undefined;
    const accessEmpresaId = accessFilter.empresaId;
    if (typeof accessEmpresaId === 'string') {
      empresaId = accessEmpresaId;
    } else if (accessEmpresaId && 'in' in accessEmpresaId) {
      empresaId = accessEmpresaId.in[0];
    }

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
          tenantId: user.tenantId,
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
      tenant: { connect: { id: user.tenantId } },
      ...(empresaId && { empresa: { connect: { id: empresaId } } }),
      segmento: restDto.segmento || SegmentoCliente.OTRO,
      nivelRiesgo: restDto.nivelRiesgo || NivelRiesgo.MEDIO,
      metrajeTotal: toDecimal(metrajeTotal, 2)
        ? new Prisma.Decimal(toDecimal(metrajeTotal, 2)!)
        : null,
      creadoPor: user.membershipId
        ? { connect: { id: user.membershipId } }
        : undefined,
      ...(tipoInteresId && {
        tipoInteres: { connect: { id: tipoInteresId } },
      }),

      direcciones: {
        create: direcciones?.map((d) => ({
          ...d,
          tenantId: user.tenantId,
          ...(empresaId && { empresaId }),
          latitud: d.latitud ? Number(d.latitud) : null,
          longitud: d.longitud ? Number(d.longitud) : null,
          precisionGPS: toDecimal(d.precisionGPS, 2),
        })),
      },

      vehiculos: {
        create: vehiculos?.map((v) => ({
          ...v,
          tenantId: user.tenantId,
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

  async findOne(id: string, user: JwtPayload): Promise<Cliente | null> {
    const accessFilter = getPrismaAccessFilter(user);

    return this.prisma.cliente.findFirst({
      where: this.buildClienteWhere(accessFilter, { id, deletedAt: null }),
      include: {
        direcciones: {
          include: { municipioRel: true },
        },
        vehiculos: true,
        tipoInteres: true,
        empresa: true,
        contratosCliente: {
          where: {
            ...(accessFilter.tenantId
              ? { tenantId: accessFilter.tenantId }
              : {}),
            ...(accessFilter.empresaId
              ? { empresaId: accessFilter.empresaId }
              : {}),
            estado: EstadoContratoCliente.ACTIVO,
          },
          orderBy: { fechaInicio: 'desc' },
        },
      },
    });
  }

  async update(
    id: string,
    user: JwtPayload,
    dto: Partial<CreateClienteDto>,
  ): Promise<Cliente> {
    const accessFilter = getPrismaAccessFilter(user);

    // Verify access first
    const existing = await this.prisma.cliente.findFirst({
      where: this.buildClienteWhere(accessFilter, { id }),
    });
    if (!existing) {
      throw new UnauthorizedException(
        'No tienes permisos para editar este cliente',
      );
    }

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
              tenantId: user.tenantId,
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
              tenantId: user.tenantId,
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

  async remove(id: string, user: JwtPayload): Promise<Cliente> {
    const accessFilter = getPrismaAccessFilter(user);

    // Verify access
    const existing = await this.prisma.cliente.findFirst({
      where: this.buildClienteWhere(accessFilter, { id }),
    });
    if (!existing) {
      throw new UnauthorizedException(
        'No tienes permisos para eliminar este cliente',
      );
    }

    return this.prisma.cliente.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
