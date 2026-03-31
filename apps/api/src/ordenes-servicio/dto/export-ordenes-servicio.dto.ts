import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ServiciosPreset } from './query-ordenes-servicio.dto';

export class ExportOrdenesServicioDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  empresaIds?: string[];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeAllEmpresas?: boolean;

  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;

  @IsOptional()
  @IsEnum(ServiciosPreset)
  preset?: ServiciosPreset;
}
