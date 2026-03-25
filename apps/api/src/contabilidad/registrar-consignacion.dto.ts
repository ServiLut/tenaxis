import { Transform } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

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

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  })
  @IsNumber()
  valorConsignado?: number;

  @IsString()
  referenciaBanco: string;

  @IsString()
  ordenIds: string;

  @IsDateString()
  fechaConsignacion: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}
