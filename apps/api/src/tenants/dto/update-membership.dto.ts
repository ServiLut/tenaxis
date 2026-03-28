import {
  IsArray,
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '../../generated/client/client';

export class UpdateMembershipDto {
  @IsString()
  @IsOptional()
  placa?: string;

  @IsBoolean()
  @IsOptional()
  moto?: boolean;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsUUID()
  @IsOptional()
  municipioId?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  departmentIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  municipalityIds?: string[];

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  apellido?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  tipoDocumento?: string;

  @IsString()
  @IsOptional()
  numeroDocumento?: string;

  @IsString()
  @IsOptional()
  banco?: string;

  @IsString()
  @IsOptional()
  tipoCuenta?: string;

  @IsString()
  @IsOptional()
  numeroCuenta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  valorHora?: number;

  @IsOptional()
  @IsUUID()
  cuentaPagoEmpresaId?: string;

  @IsOptional()
  @IsUUID('all', { each: true })
  empresaIds?: string[];
}
