import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { Cliente, ClasificacionCliente } from '../generated/client/client';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, empresaId?: string, userRole?: string) {
    let clients: Cliente[] = [];

    if (userRole === 'SU_ADMIN') {
      clients = await this.prisma.cliente.findMany({
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
      });
    } else if (userRole === 'ADMIN') {
      clients = await this.prisma.cliente.findMany({
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
      });
    } else if (empresaId) {
      clients = await this.prisma.cliente.findMany({
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
      });
    }

    // Apply "Riesgo Comercial" logic in response (more than 45 days since last visit)
    const now = new Date();
    const result: Cliente[] = clients.map((client: Cliente): Cliente => {
      const lastVisit = client.ultimaVisita
        ? new Date(client.ultimaVisita)
        : null;
      if (lastVisit) {
        const diffDays =
          (now.getTime() - lastVisit.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 45) {
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

  async create(
    tenantId: string,
    userId: string,
    dto: CreateClienteDto,
    reqEmpresaId?: string,
  ) {
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

    const toDecimal = (val: any, decimals: number = 2) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num.toFixed(decimals);
    };

    const orConditions: any[] = [];
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
      return await this.prisma.cliente.create({
        data,
        include: {
          direcciones: true,
          vehiculos: true,
          segmento: true,
          riesgo: true,
          tipoInteres: true,
        },
      });
    } catch (error) {
      console.error(
        'Error creating cliente. Data:',
        JSON.stringify(data, null, 2),
      );
      console.error('Prisma Error:', error);
      throw error;
    }
  }

  async findOne(id: string, tenantId: string) {
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
  ) {
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

    return this.prisma.cliente.update({
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
    });
  }

  async remove(id: string, tenantId: string) {
    return this.prisma.cliente.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    });
  }
}
