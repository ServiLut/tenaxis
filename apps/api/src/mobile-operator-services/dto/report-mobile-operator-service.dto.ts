import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ReportMobileOperatorServiceDto {
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidenciaPaths?: string[];

  @IsNumber()
  @IsOptional()
  latitud?: number;

  @IsNumber()
  @IsOptional()
  longitud?: number;

  @IsString()
  @IsOptional()
  linkMaps?: string;

  @IsDateString()
  @IsOptional()
  occurredAt?: string;
}
