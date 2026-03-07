import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { EstadoOrden, UrgenciaOrden } from '../../generated/client/client';

export enum ServiciosPreset {
  HOY = 'HOY',
  MANANA = 'MANANA',
  SEMANA = 'SEMANA',
  VENCIDOS = 'VENCIDOS',
  SIN_TECNICO = 'SIN_TECNICO',
  PENDIENTES_LIQUIDAR = 'PENDIENTES_LIQUIDAR',
}

export class QueryOrdenesServicioDto {
  @IsOptional()
  @IsUUID()
  empresaId?: string;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(EstadoOrden)
  estado?: EstadoOrden;

  @IsOptional()
  @IsUUID()
  tecnicoId?: string;

  @IsOptional()
  @IsEnum(UrgenciaOrden)
  urgencia?: UrgenciaOrden;

  @IsOptional()
  @IsUUID()
  creadorId?: string;

  @IsOptional()
  @IsString()
  municipio?: string;

  @IsOptional()
  @IsUUID()
  metodoPagoId?: string;

  @IsOptional()
  @IsString()
  tipoVisita?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsEnum(ServiciosPreset)
  preset?: ServiciosPreset;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export const normalizeSearchToken = (value?: string) =>
  value?.trim().toUpperCase() || undefined;

export const toLocalDayRange = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const applyPresetRange = (preset?: ServiciosPreset) => {
  if (!preset) return undefined;

  const now = new Date();

  if (preset === ServiciosPreset.HOY) {
    return toLocalDayRange(now);
  }

  if (preset === ServiciosPreset.MANANA) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return toLocalDayRange(tomorrow);
  }

  if (preset === ServiciosPreset.SEMANA) {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (preset === ServiciosPreset.VENCIDOS) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    return { end: yesterday };
  }

  return undefined;
};

export const toDayBoundsFromIso = (iso?: string) => {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return toLocalDayRange(date);
};
