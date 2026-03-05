import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecordEventDto {
  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  ruta?: string;
}

export class HeartbeatDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(60)
  @Type(() => Number)
  inactiveMinutes?: number;
}

export class MonitoringPaginationDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
