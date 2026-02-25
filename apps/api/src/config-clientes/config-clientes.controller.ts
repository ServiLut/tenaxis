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
import { CreateSegmentoDto, UpdateSegmentoDto } from './dto/segmento.dto';
import { CreateRiesgoDto, UpdateRiesgoDto } from './dto/riesgo.dto';
import { CreateTipoInteresDto, UpdateTipoInteresDto } from './dto/interes.dto';
import { CreateServicioDto, UpdateServicioDto } from './dto/servicio.dto';
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

  // --- Segmentos ---
  @Get('segmentos')
  async findAllSegmentos(@Request() req: RequestWithUser) {
    return this.configService.findAllSegmentos(req.user.tenantId || '');
  }

  @Post('segmentos')
  async createSegmento(
    @Request() req: RequestWithUser,
    @Body() dto: CreateSegmentoDto,
  ) {
    return this.configService.createSegmento(req.user.tenantId || '', dto);
  }

  @Patch('segmentos/:id')
  async updateSegmento(
    @Param('id') id: string,
    @Body() dto: UpdateSegmentoDto,
  ) {
    return this.configService.updateSegmento(id, dto);
  }

  // --- Riesgos ---
  @Get('riesgos')
  async findAllRiesgos(@Request() req: RequestWithUser) {
    return this.configService.findAllRiesgos(req.user.tenantId || '');
  }

  @Post('riesgos')
  async createRiesgo(
    @Request() req: RequestWithUser,
    @Body() dto: CreateRiesgoDto,
  ) {
    return this.configService.createRiesgo(req.user.tenantId || '', dto);
  }

  @Patch('riesgos/:id')
  async updateRiesgo(@Param('id') id: string, @Body() dto: UpdateRiesgoDto) {
    return this.configService.updateRiesgo(id, dto);
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
}
