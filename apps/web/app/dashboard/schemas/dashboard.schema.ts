import { z } from "zod";

export const DashboardKpisSchema = z.object({
  ingresos: z.object({
    current: z.number(),
    previous: z.number(),
    change: z.number(),
  }),
  ordenes: z.object({
    current: z.number(),
    previous: z.number(),
    change: z.number(),
  }),
  sla: z.object({
    value: z.number(),
  }),
  cobranza: z.object({
    total: z.number(),
  }),
});

export const DashboardTrendsSchema = z.object({
  ingresosSemanales: z.array(z.number()),
  monthlyComparison: z.array(z.object({
    label: z.string(),
    value: z.number(),
  })),
});

export const DashboardActionableSchema = z.object({
  vencidas: z.number(),
  sinAsignacion: z.number(),
  alertas: z.number(),
});

export const DashboardStatsSchema = z.object({
  kpis: DashboardKpisSchema,
  trends: DashboardTrendsSchema,
  actionable: DashboardActionableSchema,
});

export type DashboardStatsType = z.infer<typeof DashboardStatsSchema>;
export type DashboardKpisType = z.infer<typeof DashboardKpisSchema>;
export type DashboardTrendsType = z.infer<typeof DashboardTrendsSchema>;
export type DashboardActionableType = z.infer<typeof DashboardActionableSchema>;
