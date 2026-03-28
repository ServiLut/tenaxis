import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class RegistrarConsignacionDto {
  @IsUUID()
  tecnicoId: string;

  @IsUUID()
  empresaId: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Number(value);
  })
  @IsNumber()
  valorConsignado?: number;

  @IsString()
  referenciaBanco: string;

  @IsString()
  comprobantePath: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ordenIds: string[];

  @IsDateString()
  fechaConsignacion: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}
