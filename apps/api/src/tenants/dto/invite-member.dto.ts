import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '../../generated/client/client';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  apellido?: string;

  @IsString()
  @IsOptional()
  telefono?: string;
}
