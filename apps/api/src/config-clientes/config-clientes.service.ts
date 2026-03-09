import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoInteresDto, UpdateTipoInteresDto } from './dto/interes.dto';
import { CreateServicioDto, UpdateServicioDto } from './dto/servicio.dto';
import { UpsertClienteConfigDto } from './dto/cliente-config.dto';
import { CreateSegmentoDto, UpdateSegmentoDto } from './dto/segmento.dto';
import { CreateRiesgoDto, UpdateRiesgoDto } from './dto/riesgo.dto';
import { NivelRiesgo, SegmentoCliente } from '../generated/client/client';

const SEGMENTOS_CATALOG = [
  {
    id: SegmentoCliente.HOGAR,
    nombre: 'HOGAR',
    descripcion: 'Residencial y propiedad horizontal',
    frecuenciaSugerida: 90,
    riesgoSugerido: NivelRiesgo.BAJO,
    activo: true,
  },
  {
    id: SegmentoCliente.COMERCIO,
    nombre: 'COMERCIO',
    descripcion: 'Retail, tiendas y restaurantes',
    frecuenciaSugerida: 30,
    riesgoSugerido: NivelRiesgo.MEDIO,
    activo: true,
  },
  {
    id: SegmentoCliente.INDUSTRIA,
    nombre: 'INDUSTRIA',
    descripcion: 'Plantas, bodegas y procesos productivos',
    frecuenciaSugerida: 15,
    riesgoSugerido: NivelRiesgo.ALTO,
    activo: true,
  },
  {
    id: SegmentoCliente.SALUD,
    nombre: 'SALUD',
    descripcion: 'Clínicas, hospitales y consultorios',
    frecuenciaSugerida: 15,
    riesgoSugerido: NivelRiesgo.ALTO,
    activo: true,
  },
  {
    id: SegmentoCliente.EDUCACION,
    nombre: 'EDUCACION',
    descripcion: 'Colegios, universidades e instituciones educativas',
    frecuenciaSugerida: 30,
    riesgoSugerido: NivelRiesgo.MEDIO,
    activo: true,
  },
  {
    id: SegmentoCliente.HORECA,
    nombre: 'HORECA',
    descripcion: 'Hoteles, restaurantes y catering',
    frecuenciaSugerida: 15,
    riesgoSugerido: NivelRiesgo.ALTO,
    activo: true,
  },
  {
    id: SegmentoCliente.OFICINA,
    nombre: 'OFICINA',
    descripcion: 'Oficinas administrativas y corporativas',
    frecuenciaSugerida: 30,
    riesgoSugerido: NivelRiesgo.BAJO,
    activo: true,
  },
  {
    id: SegmentoCliente.OTRO,
    nombre: 'OTRO',
    descripcion: 'Casos no clasificados en el catálogo estándar',
    frecuenciaSugerida: 30,
    riesgoSugerido: NivelRiesgo.MEDIO,
    activo: true,
  },
] as const;

const RIESGOS_CATALOG = [
  {
    id: NivelRiesgo.BAJO,
    nombre: 'BAJO',
    color: 'emerald',
    valor: 1,
    activo: true,
  },
  {
    id: NivelRiesgo.MEDIO,
    nombre: 'MEDIO',
    color: 'amber',
    valor: 2,
    activo: true,
  },
  {
    id: NivelRiesgo.ALTO,
    nombre: 'ALTO',
    color: 'orange',
    valor: 3,
    activo: true,
  },
  {
    id: NivelRiesgo.CRITICO,
    nombre: 'CRITICO',
    color: 'red',
    valor: 4,
    activo: true,
  },
] as const;

@Injectable()
export class ConfigClientesService {
  constructor(private prisma: PrismaService) {}

  // --- Configuracion Operativa de Clientes ---
  async findClienteConfig(
    tenantId: string,
    clienteId: string,
    empresaId: string,
    direccionId?: string,
  ) {
    return this.prisma.clienteConfiguracionOperativa.findFirst({
      where: {
        tenantId,
        clienteId,
        empresaId,
        direccionId: direccionId || null,
      },
    });
  }

  async findAllClienteConfigs(tenantId: string, clienteId: string) {
    return this.prisma.clienteConfiguracionOperativa.findMany({
      where: { tenantId, clienteId },
      include: {
        direccion: {
          select: { nombreSede: true, direccion: true },
        },
      },
    });
  }

  async upsertClienteConfig(tenantId: string, dto: UpsertClienteConfigDto) {
    const { clienteId, empresaId, direccionId, ...configData } = dto;

    // Buscamos si ya existe una configuración para este cliente/empresa/sede
    const existing = await this.prisma.clienteConfiguracionOperativa.findFirst({
      where: {
        tenantId,
        clienteId,
        empresaId,
        direccionId: direccionId || null,
      },
    });

    if (existing) {
      return this.prisma.clienteConfiguracionOperativa.update({
        where: { id: existing.id },
        data: configData,
      });
    }

    return this.prisma.clienteConfiguracionOperativa.create({
      data: {
        ...configData,
        clienteId,
        empresaId,
        tenantId,
        direccionId: direccionId || null,
      },
    });
  }

  // --- Segmentos ---
  findAllSegmentos(tenantId: string) {
    void tenantId;
    return SEGMENTOS_CATALOG;
  }

  createSegmento(tenantId: string, dto: CreateSegmentoDto) {
    void tenantId;
    return { id: 'dummy', ...dto };
  }

  updateSegmento(id: string, dto: UpdateSegmentoDto) {
    return { id, ...dto };
  }

  // --- Riesgos ---
  findAllRiesgos(tenantId: string) {
    void tenantId;
    return RIESGOS_CATALOG;
  }

  createRiesgo(tenantId: string, dto: CreateRiesgoDto) {
    void tenantId;
    return { id: 'dummy', ...dto };
  }

  updateRiesgo(id: string, dto: UpdateRiesgoDto) {
    return { id, ...dto };
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

  // --- Estados de Servicio ---
  async findAllEstadosServicio(tenantId: string, empresaId: string) {
    return this.prisma.estadoServicio.findMany({
      where: { tenantId, empresaId, activo: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
