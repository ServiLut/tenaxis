import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Matches,
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

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe estar en formato YYYY-MM-DD',
  })
  date?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate debe estar en formato YYYY-MM-DD',
  })
  startDate?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate debe estar en formato YYYY-MM-DD',
  })
  endDate?: string;
}
