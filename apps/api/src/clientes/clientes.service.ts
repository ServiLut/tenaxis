import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.cliente.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
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

  async create(tenantId: string, userId: string, dto: CreateClienteDto) {
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
    const empresaId = membership?.empresaMemberships[0]?.empresaId;

    const toDecimal = (val: any, decimals: number = 2) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num.toFixed(decimals);
    };

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
          // Asegurar que las coordenadas se traten como Decimal si vienen como string/number
          // y evitar overflow de campos numéricos en PostgreSQL
          latitud: toDecimal(d.latitud, 8),
          longitud: toDecimal(d.longitud, 8),
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
}
