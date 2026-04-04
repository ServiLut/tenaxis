import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  EstadoOrden,
  EstadoPagoOrden,
  MetodoPagoBase,
  UrgenciaOrden,
  TipoVisita,
} from '../../generated/client/client';
import {
  addBogotaDaysUtc,
  endOfBogotaDayUtc,
  endOfBogotaWeekUtc,
  startOfBogotaDayUtc,
  startOfBogotaWeekUtc,
  toBogotaDayBoundsUtc,
} from '../../common/utils/timezone.util';

export enum ServiciosPreset {
  HOY = 'HOY',
  MANANA = 'MANANA',
  SEMANA = 'SEMANA',
  SEGUIMIENTOS = 'SEGUIMIENTOS',
  VENCIDOS = 'VENCIDOS',
  SIN_TECNICO = 'SIN_TECNICO',
  PENDIENTES_LIQUIDAR = 'PENDIENTES_LIQUIDAR',
  RECHAZADOS = 'RECHAZADOS',
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
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsUUID()
  metodoPagoId?: string;

  @IsOptional()
  @IsEnum(MetodoPagoBase)
  metodoPagoBase?: MetodoPagoBase;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsEnum(MetodoPagoBase, { each: true })
  metodosPagoBase?: MetodoPagoBase[];

  @IsOptional()
  @IsEnum(EstadoPagoOrden)
  estadoPago?: EstadoPagoOrden;

  @IsOptional()
  @IsEnum(TipoVisita)
  tipoVisita?: TipoVisita;

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
  return {
    start: startOfBogotaDayUtc(date),
    end: endOfBogotaDayUtc(date),
  };
};

export const applyPresetRange = (preset?: ServiciosPreset) => {
  if (!preset) return undefined;

  const now = new Date();

  if (preset === ServiciosPreset.HOY) {
    return toLocalDayRange(now);
  }

  if (preset === ServiciosPreset.MANANA) {
    const tomorrow = addBogotaDaysUtc(now, 1);
    return toLocalDayRange(tomorrow);
  }

  if (preset === ServiciosPreset.SEMANA) {
    const start = startOfBogotaWeekUtc(now);
    const end = endOfBogotaWeekUtc(now);
    return { start, end };
  }

  if (preset === ServiciosPreset.VENCIDOS) {
    const yesterday = addBogotaDaysUtc(now, -1);
    const yesterdayEnd = endOfBogotaDayUtc(yesterday);
    return { end: yesterdayEnd };
  }

  return undefined;
};

export const toDayBoundsFromIso = (iso?: string) => {
  if (!iso) return undefined;
  return toBogotaDayBoundsUtc(iso);
};
