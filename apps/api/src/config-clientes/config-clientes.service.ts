import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSegmentoDto, UpdateSegmentoDto } from './dto/segmento.dto';
import { CreateRiesgoDto, UpdateRiesgoDto } from './dto/riesgo.dto';
import { CreateTipoInteresDto, UpdateTipoInteresDto } from './dto/interes.dto';
import { CreateServicioDto, UpdateServicioDto } from './dto/servicio.dto';

@Injectable()
export class ConfigClientesService {
  constructor(private prisma: PrismaService) {}

  // --- Segmentos ---
  async findAllSegmentos(tenantId: string) {
    return this.prisma.segmentoNegocio.findMany({
      where: { tenantId },
      orderBy: { nombre: 'asc' },
    });
  }

  async createSegmento(tenantId: string, dto: CreateSegmentoDto) {
    return this.prisma.segmentoNegocio.create({
      data: { ...dto, tenantId },
    });
  }

  async updateSegmento(id: string, dto: UpdateSegmentoDto) {
    return this.prisma.segmentoNegocio.update({
      where: { id },
      data: dto,
    });
  }

  // --- Riesgos ---
  async findAllRiesgos(tenantId: string) {
    return this.prisma.nivelRiesgoOperativo.findMany({
      where: { tenantId },
      orderBy: { valor: 'asc' },
    });
  }

  async createRiesgo(tenantId: string, dto: CreateRiesgoDto) {
    return this.prisma.nivelRiesgoOperativo.create({
      data: { ...dto, tenantId },
    });
  }

  async updateRiesgo(id: string, dto: UpdateRiesgoDto) {
    return this.prisma.nivelRiesgoOperativo.update({
      where: { id },
      data: dto,
    });
  }

  // --- Tipos de Interés ---
  async findAllTiposInteres(tenantId: string) {
    return this.prisma.tipoInteres.findMany({
      where: { tenantId },
      orderBy: { nombre: 'asc' },
    });
  }

  async createTipoInteres(tenantId: string, dto: CreateTipoInteresDto) {
    return this.prisma.tipoInteres.create({
      data: { ...dto, tenantId },
    });
  }

  async updateTipoInteres(id: string, dto: UpdateTipoInteresDto) {
    return this.prisma.tipoInteres.update({
      where: { id },
      data: dto,
    });
  }

  // --- Servicios ---
  async findAllServicios(tenantId: string, empresaId?: string) {
    return this.prisma.servicio.findMany({
      where: {
        tenantId,
        ...(empresaId ? { empresaId } : {}),
        deleteAt: null,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async createServicio(tenantId: string, dto: CreateServicioDto) {
    return this.prisma.servicio.create({
      data: { ...dto, tenantId },
    });
  }

  async updateServicio(id: string, dto: UpdateServicioDto) {
    return this.prisma.servicio.update({
      where: { id },
      data: dto,
    });
  }

  async deleteServicio(id: string) {
    return this.prisma.servicio.update({
      where: { id },
      data: { deleteAt: new Date(), activo: false },
    });
  }

  // --- Tipos de Servicio ---
  async findAllTiposServicio(tenantId: string, empresaId: string) {
    return this.prisma.tipoServicio.findMany({
      where: { tenantId, empresaId, activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  // --- Métodos de Pago ---
  async findAllMetodosPago(tenantId: string, empresaId: string) {
    return this.prisma.metodoPago.findMany({
      where: { tenantId, empresaId, activo: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
