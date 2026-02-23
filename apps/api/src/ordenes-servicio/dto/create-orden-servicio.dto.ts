import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { 
  NivelInfestacion, 
  TipoVisita, 
  TipoFacturacion, 
  EstadoPagoOrden,
  UrgenciaOrden
} from '../../generated/client/client';

export class CreateOrdenServicioDto {
  @IsUUID()
  @IsNotEmpty()
  clienteId: string;

  @IsUUID()
  @IsNotEmpty()
  empresaId: string;

  @IsUUID()
  @IsOptional()
  direccionId?: string;

  @IsUUID()
  @IsOptional()
  tecnicoId?: string;

  @IsString()
  @IsOptional()
  direccionTexto?: string;

  @IsString()
  @IsNotEmpty()
  servicioEspecifico: string; // Will create or find the service by name

  @IsString()
  @IsOptional()
  observacion?: string;

  @IsEnum(NivelInfestacion)
  @IsOptional()
  nivelInfestacion?: NivelInfestacion;

  @IsEnum(UrgenciaOrden)
  @IsOptional()
  urgencia?: UrgenciaOrden;

  @IsEnum(TipoVisita)
  @IsOptional()
  tipoVisita?: TipoVisita;

  @IsNumber()
  @IsOptional()
  frecuenciaSugerida?: number;

  @IsEnum(TipoFacturacion)
  @IsOptional()
  tipoFacturacion?: TipoFacturacion;

  @IsNumber()
  @IsOptional()
  valorCotizado?: number;

  @IsUUID()
  @IsOptional()
  metodoPagoId?: string;

  @IsEnum(EstadoPagoOrden)
  @IsOptional()
  estadoPago?: EstadoPagoOrden;

  @IsDateString()
  @IsOptional()
  fechaVisita?: string;

  @IsDateString()
  @IsOptional()
  horaInicio?: string;

  @IsNumber()
  @IsOptional()
  duracionMinutos?: number; // Not directly in schema but can be used to calculate horaFin

  // In the frontend they have 'Urgencia' and 'Servicio Específico' which we can save in observacion or we can add them to the DB later. We map 'Servicio Específico' to 'observacion' for now.
}