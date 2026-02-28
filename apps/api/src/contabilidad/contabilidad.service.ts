import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoConsignacion } from '../generated/client/client';

@Injectable()
export class ContabilidadService {
  constructor(private prisma: PrismaService) {}

  async getRecaudoTecnicos(tenantId: string, empresaId?: string) {
    // Buscar todos los técnicos (TenantMembership con rol OPERADOR)
    const tecnicos = await this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        role: 'OPERADOR',
        activo: true,
        // Si hay empresaId, filtrar por los que pertenecen a esa empresa
        empresaMemberships: empresaId ? { some: { empresaId, activo: true } } : undefined,
      },
      include: {
        user: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
        // Obtener declaraciones de efectivo pendientes
        declaracionesEfectivo: {
          where: {
            consignado: false,
            empresaId: empresaId || undefined,
          },
          select: {
            valorDeclarado: true,
            fechaDeclaracion: true,
            ordenId: true,
          },
        },
        // Obtener la última consignación realizada para saber la fecha
        consignacionesTecnico: {
          where: {
            empresaId: empresaId || undefined,
          },
          orderBy: {
            fechaConsignacion: 'desc',
          },
          take: 1,
          select: {
            fechaConsignacion: true,
          },
        },
      },
    });

    return tecnicos.map((t) => {
      const saldoPendiente = t.declaracionesEfectivo.reduce(
        (sum, d) => sum + Number(d.valorDeclarado),
        0,
      );
      
      const ultimaTrans = t.consignacionesTecnico[0]?.fechaConsignacion;
      const diasSinTransferir = ultimaTrans 
        ? Math.floor((new Date().getTime() - new Date(ultimaTrans).getTime()) / (1000 * 3600 * 24))
        : Math.floor((new Date().getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600 * 24));

      return {
        id: t.id,
        nombre: t.user.nombre,
        apellido: t.user.apellido,
        saldoPendiente,
        ordenesPendientesCount: t.declaracionesEfectivo.length,
        ordenesIds: t.declaracionesEfectivo.map(d => d.ordenId),
        ultimaTransferencia: ultimaTrans || null,
        diasSinTransferir,
      };
    });
  }

  async registrarConsignacion(
    tenantId: string,
    creadoPorId: string,
    data: {
      tecnicoId: string;
      empresaId: string;
      valorConsignado: number;
      referenciaBanco: string;
      comprobantePath: string;
      ordenIds: string[];
      fechaConsignacion: string;
      observacion?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear la consignación global
      const consignacion = await tx.consignacionEfectivo.create({
        data: {
          tenantId,
          empresaId: data.empresaId,
          tecnicoId: data.tecnicoId,
          creadoPorId: creadoPorId,
          valorConsignado: data.valorConsignado,
          referenciaBanco: data.referenciaBanco,
          comprobantePath: data.comprobantePath,
          fechaConsignacion: new Date(data.fechaConsignacion),
          estado: EstadoConsignacion.PENDIENTE,
          observacion: data.observacion,
        },
      });

      // 2. Vincular con cada orden y actualizar declaración
      for (const ordenId of data.ordenIds) {
        await tx.consignacionOrden.create({
          data: {
            tenantId,
            empresaId: data.empresaId,
            consignacionId: consignacion.id,
            ordenId: ordenId,
          },
        });

        // Marcar declaración como consignada
        await tx.declaracionEfectivo.update({
          where: { ordenId: ordenId },
          data: { consignado: true },
        });
      }

      return consignacion;
    });
  }
}
