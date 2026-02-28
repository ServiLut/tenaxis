import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { Cliente, ClasificacionCliente } from '../generated/client/client';

type ClienteWithRelations = Cliente & {
  segmento?: { frecuenciaSugerida?: number | null } | null;
};

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    empresaId?: string,
    userRole?: string,
  ): Promise<Cliente[]> {
    let clients: ClienteWithRelations[] = [];

    if (userRole === 'SU_ADMIN') {
      clients = (await this.prisma.cliente.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          direcciones: {
            include: { municipioRel: true },
          },
          vehiculos: true,
          segmento: true,
          riesgo: true,
          tipoInteres: true,
          tenant: true,
          empresa: true,
        },
      })) as ClienteWithRelations[];
    } else if (userRole === 'ADMIN') {
      clients = (await this.prisma.cliente.findMany({
        where: {
          tenantId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          direcciones: {
            include: { municipioRel: true },
          },
          vehiculos: true,
          segmento: true,
          riesgo: true,
          tipoInteres: true,
          empresa: true,
        },
      })) as ClienteWithRelations[];
    } else if (empresaId) {
      clients = (await this.prisma.cliente.findMany({
        where: {
          tenantId,
          empresaId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          direcciones: {
            include: { municipioRel: true },
          },
          vehiculos: true,
          segmento: true,
          riesgo: true,
          tipoInteres: true,
          empresa: true,
        },
      })) as ClienteWithRelations[];
    }

    // Apply "Riesgo Comercial" logic in response (more than 45 days since last visit or 1.5x frequency)
    const now = new Date();
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

          // Frecuencia sugerida: prefer client's own frequency, then segment's, then default 30
          const frequency =
            client.frecuenciaServicio ||
            client.segmento?.frecuenciaSugerida ||
            30;

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

  async create(
    tenantId: string,
    userId: string,
    dto: CreateClienteDto,
    reqEmpresaId?: string,
  ): Promise<Cliente> {
    const {
      direcciones,
      vehiculos,
      segmentoId,
      riesgoId,
      metrajeTotal,
      ...clienteData
    } = dto;

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

    const orConditions: Record<string, string>[] = [];
    if (
      clienteData.numeroDocumento &&
      clienteData.numeroDocumento !== 'No Concretado'
    ) {
      orConditions.push({ numeroDocumento: clienteData.numeroDocumento });
    }
    if (clienteData.nit && clienteData.nit !== 'No Concretado') {
      orConditions.push({ nit: clienteData.nit });
    }
    if (clienteData.telefono && clienteData.telefono !== 'No Concretado') {
      orConditions.push({ telefono: clienteData.telefono });
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
      ...clienteData,
      tenantId,
      ...(empresaId && { empresaId }),
      segmentoId,
      riesgoId,
      metrajeTotal: toDecimal(metrajeTotal, 2),
      creadoPorId: membership.id,
      direcciones: {
        create: direcciones?.map((d) => ({
          ...d,
          tenantId,
          ...(empresaId && { empresaId }),
          // Asegurar que las coordenadas se traten como números para el tipo Float
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
    };

    try {
      return (await this.prisma.cliente.create({
        data,
        include: {
          direcciones: true,
          vehiculos: true,
          segmento: true,
          riesgo: true,
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
        segmento: true,
        riesgo: true,
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
    const {
      direcciones,
      vehiculos,
      segmentoId,
      riesgoId,
      metrajeTotal,
      ...clienteData
    } = dto;

    const toDecimal = (val: unknown, decimals: number = 2) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num.toFixed(decimals);
    };

    // For simplicity in this update, we delete and recreate direcciones and vehiculos
    // A more advanced version would use upsert or nested updates
    await this.prisma.direccion.deleteMany({ where: { clienteId: id } });
    await this.prisma.vehiculo.deleteMany({ where: { clienteId: id } });

    return (await this.prisma.cliente.update({
      where: { id },
      data: {
        ...clienteData,
        segmentoId,
        riesgoId,
        metrajeTotal: toDecimal(metrajeTotal, 2),
        direcciones: {
          create: direcciones?.map((d) => ({
            ...d,
            tenantId,
            latitud: d.latitud ? Number(d.latitud) : null,
            longitud: d.longitud ? Number(d.longitud) : null,
            precisionGPS: toDecimal(d.precisionGPS, 2),
          })),
        },
        vehiculos: {
          create: vehiculos?.map((v) => ({
            ...v,
            tenantId,
          })),
        },
      },
      include: {
        direcciones: true,
        vehiculos: true,
        segmento: true,
        riesgo: true,
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
