import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ConfigClientesService } from './config-clientes.service';
import { CreateTipoInteresDto, UpdateTipoInteresDto } from './dto/interes.dto';
import { CreateServicioDto, UpdateServicioDto } from './dto/servicio.dto';
import { UpsertClienteConfigDto } from './dto/cliente-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: JwtPayload;
}

@Controller('config-clientes')
@UseGuards(JwtAuthGuard)
export class ConfigClientesController {
  constructor(private readonly configService: ConfigClientesService) {}

  // --- ConfiguraciÃ³n Operativa de Clientes ---
  @Get('operativa/:clienteId')
  async findAllClienteConfigs(
    @Request() req: RequestWithUser,
    @Param('clienteId') clienteId: string,
  ) {
    return this.configService.findAllClienteConfigs(
      req.user.tenantId || '',
      clienteId,
    );
  }

  @Get('operativa/:clienteId/especifica')
  async findClienteConfig(
    @Request() req: RequestWithUser,
    @Param('clienteId') clienteId: string,
    @Query('empresaId') empresaId: string,
    @Query('direccionId') direccionId?: string,
  ) {
    return this.configService.findClienteConfig(
      req.user.tenantId || '',
      clienteId,
      empresaId,
      direccionId,
    );
  }

  @Post('operativa')
  async upsertClienteConfig(
    @Request() req: RequestWithUser,
    @Body() dto: UpsertClienteConfigDto,
  ) {
    return this.configService.upsertClienteConfig(req.user.tenantId || '', dto);
  }

  // --- Segmentos ---
  @Get('segmentos')
  findAllSegmentos(@Request() req: RequestWithUser) {
    return this.configService.findAllSegmentos(req.user.tenantId || '');
  }

  // --- Riesgos ---
  @Get('riesgos')
  findAllRiesgos(@Request() req: RequestWithUser) {
    return this.configService.findAllRiesgos(req.user.tenantId || '');
  }

  // --- Tipos de Interés ---
  @Get('intereses')
  async findAllTiposInteres(@Request() req: RequestWithUser) {
    return this.configService.findAllTiposInteres(req.user.tenantId || '');
  }

  @Post('intereses')
  async createTipoInteres(
    @Request() req: RequestWithUser,
    @Body() dto: CreateTipoInteresDto,
  ) {
    return this.configService.createTipoInteres(req.user.tenantId || '', dto);
  }

  @Patch('intereses/:id')
  async updateTipoInteres(
    @Param('id') id: string,
    @Body() dto: UpdateTipoInteresDto,
  ) {
    return this.configService.updateTipoInteres(id, dto);
  }

  // --- Servicios ---
  @Get('servicios')
  async findAllServicios(
    @Request() req: RequestWithUser,
    @Query('empresaId') empresaId?: string,
  ) {
    return this.configService.findAllServicios(
      req.user.tenantId || '',
      empresaId,
    );
  }

  @Post('servicios')
  async createServicio(
    @Request() req: RequestWithUser,
    @Body() dto: CreateServicioDto,
  ) {
    return this.configService.createServicio(req.user.tenantId || '', dto);
  }

  @Patch('servicios/:id')
  async updateServicio(
    @Param('id') id: string,
    @Body() dto: UpdateServicioDto,
  ) {
    return this.configService.updateServicio(id, dto);
  }

  @Delete('servicios/:id')
  async deleteServicio(@Param('id') id: string) {
    return this.configService.deleteServicio(id);
  }

  // --- Tipos de Servicio ---
  @Get('tipos-servicio')
  async findAllTiposServicio(
    @Request() req: RequestWithUser,
    @Query('empresaId') empresaId: string,
  ) {
    return this.configService.findAllTiposServicio(
      req.user.tenantId || '',
      empresaId,
    );
  }

  // --- Métodos de Pago ---
  @Get('metodos-pago')
  async findAllMetodosPago(
    @Request() req: RequestWithUser,
    @Query('empresaId') empresaId: string,
  ) {
    return this.configService.findAllMetodosPago(
      req.user.tenantId || '',
      empresaId,
    );
  }

  // --- Estados de Servicio ---
  @Get('estados-servicio')
  async findAllEstadosServicio(
    @Request() req: RequestWithUser,
    @Query('empresaId') empresaId: string,
  ) {
    return this.configService.findAllEstadosServicio(
      req.user.tenantId || '',
      empresaId,
    );
  }
}
