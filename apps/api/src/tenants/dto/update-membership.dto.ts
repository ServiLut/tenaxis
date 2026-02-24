import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
} from 'class-validator';
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

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsOptional()
  @IsUUID('all', { each: true })
  empresaIds?: string[];
}
