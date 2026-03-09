import { Injectable } from '@nestjs/common';
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
        empresaMemberships: empresaId
          ? { some: { empresaId, activo: true } }
          : undefined,
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
        ? Math.floor(
            (new Date().getTime() - new Date(ultimaTrans).getTime()) /
              (1000 * 3600 * 24),
          )
        : Math.floor(
            (new Date().getTime() - new Date(t.createdAt).getTime()) /
              (1000 * 3600 * 24),
          );

      return {
        id: t.id,
        nombre: t.user.nombre,
        apellido: t.user.apellido,
        saldoPendiente,
        ordenesPendientesCount: t.declaracionesEfectivo.length,
        ordenesIds: t.declaracionesEfectivo.map((d) => d.ordenId),
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

  async getAccountingBalance(tenantId: string, empresaId?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    const commonWhere = {
      tenantId,
      ...(empresaId && { empresaId }),
    };

    const [
      ingresosActual,
      ingresosPrev,
      egresosActual,
      egresosPrev,
      egresosPorCategoria,
      totalNominas,
    ] = await Promise.all([
      this.prisma.ordenServicio.aggregate({
        where: {
          ...commonWhere,
          fechaVisita: { gte: startOfMonth, lte: endOfMonth },
          estadoPago: { in: ['PAGADO', 'CONCILIADO'] },
        },
        _sum: { valorPagado: true, valorCotizado: true },
      }),
      this.prisma.ordenServicio.aggregate({
        where: {
          ...commonWhere,
          fechaVisita: { gte: startOfPrevMonth, lte: endOfPrevMonth },
          estadoPago: { in: ['PAGADO', 'CONCILIADO'] },
        },
        _sum: { valorPagado: true, valorCotizado: true },
      }),
      this.prisma.egresos.aggregate({
        where: {
          ...commonWhere,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { monto: true },
      }),
      this.prisma.egresos.aggregate({
        where: {
          ...commonWhere,
          createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        },
        _sum: { monto: true },
      }),
      this.prisma.egresos.groupBy({
        by: ['categoria'],
        where: {
          ...commonWhere,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { monto: true },
      }),
      this.prisma.nomina.aggregate({
        where: {
          ...commonWhere,
          fechaGeneracion: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { totalPagar: true },
      }),
    ]);

    const totalIngresos = Number(
      ingresosActual._sum.valorPagado || ingresosActual._sum.valorCotizado || 0,
    );
    const totalIngresosPrev = Number(
      ingresosPrev._sum.valorPagado || ingresosPrev._sum.valorCotizado || 0,
    );
    const totalEgresosEfectivos = Number(egresosActual._sum.monto || 0);
    const totalNominasMonto = Number(totalNominas._sum.totalPagar || 0);

    const totalEgresos = totalEgresosEfectivos + totalNominasMonto;
    const totalEgresosPrev = Number(egresosPrev._sum.monto || 0); // Note: Simple comparison for now

    const ingresosChange =
      totalIngresosPrev > 0
        ? ((totalIngresos - totalIngresosPrev) / totalIngresosPrev) * 100
        : 0;

    const egresosChange =
      totalEgresosPrev > 0
        ? ((totalEgresos - totalEgresosPrev) / totalEgresosPrev) * 100
        : 0;

    // Build category breakdown
    const categories: { label: string; value: number; color: string }[] = [];

    if (totalNominasMonto > 0) {
      categories.push({
        label: 'Nómina',
        value:
          totalEgresos > 0
            ? Math.round((totalNominasMonto / totalEgresos) * 100)
            : 0,
        color: 'bg-primary',
      });
    }

    const colors = [
      'bg-amber-500',
      'bg-emerald-500',
      'bg-blue-500',
      'bg-purple-500',
    ];
    egresosPorCategoria.forEach((group, index) => {
      const monto = Number(group._sum?.monto || 0);
      if (monto > 0) {
        categories.push({
          label: group.categoria || 'General',
          value:
            totalEgresos > 0 ? Math.round((monto / totalEgresos) * 100) : 0,
          color: colors[index % colors.length],
        });
      }
    });

    // Ensure it sums to something if empty
    if (categories.length === 0) {
      categories.push({ label: 'Sin Gastos', value: 0, color: 'bg-muted' });
    }

    return {
      ingresos: {
        total: totalIngresos,
        change: Math.round(ingresosChange * 10) / 10,
      },
      egresos: {
        total: totalEgresos,
        change: Math.round(egresosChange * 10) / 10,
      },
      utilidad: {
        total: totalIngresos - totalEgresos,
        change: Math.round((ingresosChange - egresosChange) * 10) / 10,
      },
      categorias: categories,
    };
  }

  async getEgresos(tenantId: string, empresaId?: string) {
    return this.prisma.egresos.findMany({
      where: {
        tenantId,
        ...(empresaId && { empresaId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        membership: {
          include: {
            user: { select: { nombre: true, apellido: true } },
          },
        },
      },
    });
  }

  async getNominas(tenantId: string, empresaId?: string) {
    return this.prisma.nomina.findMany({
      where: {
        tenantId,
        ...(empresaId && { empresaId }),
      },
      orderBy: { fechaGeneracion: 'desc' },
      include: {
        membership: {
          include: {
            user: { select: { nombre: true, apellido: true } },
          },
        },
      },
    });
  }

  async getAnticipos(tenantId: string, empresaId?: string) {
    return this.prisma.anticipos.findMany({
      where: {
        tenantId,
        ...(empresaId && { empresaId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        membership: {
          include: {
            user: { select: { nombre: true, apellido: true } },
          },
        },
      },
    });
  }

  async createEgreso(
    tenantId: string,
    data: {
      titulo: string;
      monto: number;
      razon: string;
      categoria: string;
      membershipId?: string;
      empresaId: string;
    },
  ) {
    return this.prisma.egresos.create({
      data: {
        tenantId,
        empresaId: data.empresaId,
        titulo: data.titulo,
        monto: data.monto,
        razon: data.razon,
        categoria: data.categoria || 'GENERAL',
        membershipId: data.membershipId || null,
      },
    });
  }

  async createAnticipo(
    tenantId: string,
    data: {
      membershipId: string;
      monto: number;
      razon: string;
      empresaId: string;
    },
  ) {
    return this.prisma.anticipos.create({
      data: {
        tenantId,
        empresaId: data.empresaId,
        membershipId: data.membershipId,
        monto: data.monto,
        razon: data.razon,
      },
    });
  }
}
