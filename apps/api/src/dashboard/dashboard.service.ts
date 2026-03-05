import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(tenantId: string, empresaId?: string) {
    const now = new Date();
    
    // Dates for current period
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Dates for previous period (for comparisons)
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const commonWhere: any = {
      tenantId,
      ...(empresaId && { empresaId }),
    };

    const [
      ingresosActual,
      ingresosPrev,
      ordenesActivas,
      ordenesPrev,
      cobranzaPendiente,
      totalMes,
      aTiempoMes,
      sinAsignacion,
      tareasVencidas,
      alertasCriticas,
      ingresosSemanales
    ] = await Promise.all([
      // 1. Ingresos Mes Actual
      this.prisma.ordenServicio.aggregate({
        where: { ...commonWhere, fechaVisita: { gte: startOfMonth, lte: endOfMonth }, estadoPago: { in: ['PAGADO', 'CONCILIADO'] } },
        _sum: { valorPagado: true, valorCotizado: true }
      }),
      // 2. Ingresos Mes Anterior
      this.prisma.ordenServicio.aggregate({
        where: { ...commonWhere, fechaVisita: { gte: startOfPrevMonth, lte: endOfPrevMonth }, estadoPago: { in: ['PAGADO', 'CONCILIADO'] } },
        _sum: { valorPagado: true, valorCotizado: true }
      }),
      // 3. Ordenes Activas Actual (Created this month)
      this.prisma.ordenServicio.count({
        where: { ...commonWhere, createdAt: { gte: startOfMonth, lte: endOfMonth } }
      }),
      // 4. Ordenes Activas Anterior
      this.prisma.ordenServicio.count({
        where: { ...commonWhere, createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } }
      }),
      // 5. Cobranza (Pending payments)
      this.prisma.ordenServicio.aggregate({
        where: { ...commonWhere, estadoPago: 'PENDIENTE', estadoServicio: { in: ['LIQUIDADO', 'TECNICO_FINALIZO'] } },
        _sum: { valorCotizado: true }
      }),
      // 6. SLA - Total completed this month
      this.prisma.ordenServicio.count({
        where: { ...commonWhere, fechaVisita: { gte: startOfMonth, lte: endOfMonth }, estadoServicio: { in: ['LIQUIDADO', 'TECNICO_FINALIZO'] } }
      }),
      // 7. SLA - Completed on time (not rescheduled or completed same day as visita)
      // Logic: For now, simplified as count of non-cancelled/non-reprogrammed completed ones
      this.prisma.ordenServicio.count({
        where: { ...commonWhere, fechaVisita: { gte: startOfMonth, lte: endOfMonth }, estadoServicio: 'LIQUIDADO', urgencia: { not: 'CRITICA' } }
      }),
      // 8. Sin Asignación
      this.prisma.ordenServicio.count({
        where: { ...commonWhere, tecnicoId: null, estadoServicio: 'NUEVO' }
      }),
      // 9. Tareas Vencidas (Visita in past, not completed)
      this.prisma.ordenServicio.count({
        where: { 
          ...commonWhere, 
          fechaVisita: { lt: new Date(now.setHours(0,0,0,0)) }, 
          estadoServicio: { notIn: ['LIQUIDADO', 'TECNICO_FINALIZO', 'CANCELADO'] } 
        }
      }),
      // 10. Alertas Críticas
      this.prisma.ordenServicio.count({
        where: { ...commonWhere, urgencia: 'CRITICA', estadoServicio: { notIn: ['LIQUIDADO', 'CANCELADO'] } }
      }),
      // 11. Weekly Trend
      this.getWeeklyIncome(tenantId, empresaId)
    ]);

    const valActual = Number(ingresosActual._sum.valorPagado || ingresosActual._sum.valorCotizado || 0);
    const valPrev = Number(ingresosPrev._sum.valorPagado || ingresosPrev._sum.valorCotizado || 0);
    const changeIngresos = valPrev > 0 ? ((valActual - valPrev) / valPrev) * 100 : 0;
    const changeOrdenes = ordenesPrev > 0 ? ((ordenesActivas - ordenesPrev) / ordenesPrev) * 100 : 0;
    
    const sla = totalMes > 0 ? Math.round((aTiempoMes / totalMes) * 100) : 100;

    return {
      kpis: {
        ingresos: { current: valActual, previous: valPrev, change: Math.round(changeIngresos) },
        ordenes: { current: ordenesActivas, previous: ordenesPrev, change: Math.round(changeOrdenes) },
        sla: { value: sla },
        cobranza: { total: Number(cobranzaPendiente._sum.valorCotizado || 0) }
      },
      trends: {
        ingresosSemanales: ingresosSemanales,
        monthlyComparison: [
          { label: 'Anterior', value: valPrev },
          { label: 'Actual', value: valActual }
        ]
      },
      actionable: {
        vencidas: tareasVencidas,
        sinAsignacion: sinAsignacion,
        alertas: alertasCriticas
      }
    };
  }

  private async getWeeklyIncome(tenantId: string, empresaId?: string) {
    const currNow = new Date();
    const dayOfWeekNow = currNow.getDay();
    const diffToMonday = currNow.getDate() - (dayOfWeekNow === 0 ? 6 : dayOfWeekNow - 1);
    const startOfWeek = new Date(new Date(currNow).setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const ordenesSemana = await this.prisma.ordenServicio.findMany({
      where: {
        tenantId,
        ...(empresaId && { empresaId }),
        fechaVisita: { gte: startOfWeek, lt: endOfWeek },
        estadoPago: { in: ['PAGADO', 'CONCILIADO'] },
      },
      select: { fechaVisita: true, valorPagado: true, valorCotizado: true },
    });

    const weeklyStats = [0, 0, 0, 0, 0, 0, 0];
    ordenesSemana.forEach((o) => {
      if (o.fechaVisita) {
        const day = o.fechaVisita.getDay();
        const index = day === 0 ? 6 : day - 1;
        const valor = Number(o.valorPagado) || Number(o.valorCotizado) || 0;
        weeklyStats[index] += valor;
      }
    });
    return weeklyStats;
  }
}
