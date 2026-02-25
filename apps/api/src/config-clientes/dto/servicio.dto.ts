import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateServicioDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

export class UpdateServicioDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
