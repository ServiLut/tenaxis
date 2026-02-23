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
    return this.prisma.ordenServicio.create({
      data: {
        tenantId,
        empresaId: createDto.empresaId,
        clienteId: createDto.clienteId,
        servicioId: servicio.id,
        tecnicoId: createDto.tecnicoId,
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
      }
    });
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