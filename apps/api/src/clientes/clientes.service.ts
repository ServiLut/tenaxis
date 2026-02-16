import { Injectable } from '@nestjs/common';
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
          include: { municipioRel: true }
        },
        vehiculos: true,
        segmento: true,
        riesgo: true,
        tipoInteres: true,
      }
    });
  }

  async create(tenantId: string, userId: string, dto: CreateClienteDto) {
    const { 
      direcciones, 
      vehiculos,
      segmentoId, 
      riesgoId,
      ...clienteData 
    } = dto;

    const membership = await this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { empresaMemberships: true }
    });

    const empresaId = membership?.empresaMemberships[0]?.empresaId;

    if (!empresaId) {
      throw new Error('El usuario no tiene una empresa asignada');
    }

    return this.prisma.cliente.create({
      data: {
        ...clienteData,
        tenantId,
        empresaId,
        segmentoId,
        riesgoId,
        creadoPorId: membership.id,
        direcciones: {
          create: direcciones?.map(d => ({
            ...d,
            tenantId,
            empresaId,
            // Asegurar que las coordenadas se traten como Decimal si vienen como string/number
            latitud: d.latitud ? String(d.latitud) : null,
            longitud: d.longitud ? String(d.longitud) : null,
            precisionGPS: d.precisionGPS ? String(d.precisionGPS) : null,
          })),
        },
        vehiculos: {
          create: vehiculos?.map(v => ({
            ...v,
            tenantId,
            empresaId,
          })),
        }
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
}
