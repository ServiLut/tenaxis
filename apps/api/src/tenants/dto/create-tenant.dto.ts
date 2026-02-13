import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  correo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nit?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  numero?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  pagina?: string;

  @ApiProperty({ description: 'Email del dueño inicial del tenant' })
  @IsEmail()
  @IsNotEmpty()
  ownerEmail: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ownerPassword?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ownerNombre?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ownerApellido?: string;
}
