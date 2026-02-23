import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrdenServicioDto } from './dto/create-orden-servicio.dto';

@Injectable()
export class OrdenesServicioService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createDto: CreateOrdenServicioDto) {
    // 1. Validar que la empresa exista
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: createDto.empresaId },
    });
    if (!empresa) {
      throw new BadRequestException('La empresa especificada no existe');
    }

    // 2. Obtener dirección texto
    let direccionTexto = createDto.direccionTexto || 'Sin dirección';
    if (createDto.direccionId) {
      const dir = await this.prisma.direccion.findUnique({
        where: { id: createDto.direccionId },
      });
      if (dir) {
        direccionTexto = dir.direccion;
      }
    }

    // 3. Obtener el estado default o crear uno si no existe
    let estadoDefault = await this.prisma.estadoServicio.findFirst({
      where: { tenantId, empresaId: createDto.empresaId, activo: true },
    });
    
    if (!estadoDefault) {
      // Crear un estado inicial por defecto si la empresa no tiene ninguno
      estadoDefault = await this.prisma.estadoServicio.create({
        data: {
          tenantId,
          empresaId: createDto.empresaId,
          nombre: 'PROGRAMADO',
          activo: true,
        }
      });
    }

    // Calcular horaFin basado en horaInicio y duracionMinutos
    let horaInicioDate = createDto.horaInicio ? new Date(createDto.horaInicio) : null;
    let horaFinDate: Date | null = null;
    if (horaInicioDate && createDto.duracionMinutos) {
      horaFinDate = new Date(horaInicioDate.getTime() + createDto.duracionMinutos * 60000);
    }

    // 3.5 Obtener o crear el servicio específico
    let servicio = await this.prisma.servicio.findFirst({
      where: {
        tenantId,
        empresaId: createDto.empresaId,
        nombre: createDto.servicioEspecifico,
      },
    });

    if (!servicio) {
      servicio = await this.prisma.servicio.create({
        data: {
          tenantId,
          empresaId: createDto.empresaId,
          nombre: createDto.servicioEspecifico,
          activo: true,
        },
      });
    }

    // 4. Crear la orden
    const tecnicoId = createDto.tecnicoId || await this.autoAssignTechnician(tenantId, createDto, horaInicioDate, horaFinDate);

    return this.prisma.ordenServicio.create({
      data: {
        tenantId,
        empresaId: createDto.empresaId,
        clienteId: createDto.clienteId,
        servicioId: servicio.id,
        tecnicoId,
        direccionId: createDto.direccionId,
        direccionTexto,
        estadoServicioId: estadoDefault.id,
        observacion: createDto.observacion,
        nivelInfestacion: createDto.nivelInfestacion,
        urgencia: createDto.urgencia,
        tipoVisita: createDto.tipoVisita,
        frecuenciaSugerida: createDto.frecuenciaSugerida,
        tipoFacturacion: createDto.tipoFacturacion,
        valorCotizado: createDto.valorCotizado,
        metodoPagoId: createDto.metodoPagoId,
        estadoPago: createDto.estadoPago || 'PENDIENTE',
        fechaVisita: createDto.fechaVisita ? new Date(createDto.fechaVisita) : null,
        horaInicio: horaInicioDate,
        horaFin: horaFinDate,
      },
      include: {
        cliente: true,
        estadoServicio: true,
        servicio: true,
        tecnico: {
          include: { user: true }
        }
      }
    });
  }

  private async autoAssignTechnician(tenantId: string, dto: CreateOrdenServicioDto, inicio: Date | null, fin: Date | null): Promise<string | null> {
    if (!inicio || !fin) return null;

    // 1. Obtener la zona de la dirección
    const direccion = await this.prisma.direccion.findUnique({
      where: { id: dto.direccionId },
      select: { zonaId: true }
    });

    if (!direccion || !direccion.zonaId) return null;

    const zonaId = direccion.zonaId;

    // 2. Obtener operadores de esa zona con su vehículo
    const candidatos = await this.prisma.empresaMembership.findMany({
      where: {
        empresaId: dto.empresaId,
        zonaId: zonaId,
        activo: true,
        membership: { role: 'OPERADOR', activo: true }
      },
      include: {
        membership: true
      }
    });

    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const diaSemana = dias[inicio.getDay()] as any; // Cast to DiaSemana enum
    
    // Obtener reglas de Pico y Placa para hoy
    const reglasPicoPlaca = await this.prisma.picoPlaca.findFirst({
      where: { empresaId: dto.empresaId, dia: diaSemana, activo: true }
    });

    const viables = [];

    for (const c of candidatos) {
      const placa = c.membership.placa;
      const esMoto = c.membership.moto;

      // 3. Validar Pico y Placa
      if (reglasPicoPlaca && placa) {
        const digitoInteres = esMoto ? placa.charAt(0) : placa.slice(-1);
        const numDigito = parseInt(digitoInteres);
        
        if (numDigito === reglasPicoPlaca.numeroUno || numDigito === reglasPicoPlaca.numeroDos) {
          continue; // Tiene restricción, saltar
        }
      }

      // 4. Validar Disponibilidad (Traslapes)
      const traslapes = await this.prisma.ordenServicio.count({
        where: {
          tecnicoId: c.membershipId,
          fechaVisita: dto.fechaVisita ? new Date(dto.fechaVisita) : undefined,
          OR: [
            { horaInicio: { lte: inicio }, horaFin: { gte: inicio } },
            { horaInicio: { lte: fin }, horaFin: { gte: fin } },
            { horaInicio: { gte: inicio }, horaFin: { lte: fin } }
          ]
        }
      });

      if (traslapes === 0) {
        viables.push(c.membershipId);
      }
    }

    if (viables.length === 0) return null;

    // 5. Balanceo de carga: Elegir al que menos órdenes tenga hoy
    const conteos = await Promise.all(viables.map(async (id) => {
      const count = await this.prisma.ordenServicio.count({
        where: { tecnicoId: id, fechaVisita: dto.fechaVisita ? new Date(dto.fechaVisita) : undefined }
      });
      return { id, count };
    }));

    conteos.sort((a, b) => a.count - b.count);
    return conteos[0]?.id || null;
  }

  async findAll(tenantId: string, empresaId?: string) {
    return this.prisma.ordenServicio.findMany({
      where: {
        tenantId,
        ...(empresaId ? { empresaId } : {}),
      },
      include: {
        cliente: true,
        estadoServicio: true,
        tecnico: {
          include: {
            user: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
          },
        },
        servicio: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}