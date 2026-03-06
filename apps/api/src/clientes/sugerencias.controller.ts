import { 
  Controller, 
  Get, 
  Patch, 
  Param, 
  Body, 
  Request, 
  UseGuards, 
  Post
} from '@nestjs/common';
import { SugerenciasService } from './sugerencias.service';
import { EstadoSugerencia } from '../generated/client';

@Controller('clientes/sugerencias')
export class SugerenciasController {
  constructor(private readonly sugerenciasService: SugerenciasService) {}

  @Get()
  async findAll(@Request() req) {
    const tenantId = req.user.tenantId || '';
    const empresaId = req.user.empresaId;
    return this.sugerenciasService.findAll(tenantId, empresaId);
  }

  @Get('stats')
  async getQuickStats(@Request() req) {
    const tenantId = req.user.tenantId || '';
    const empresaId = req.user.empresaId;
    return this.sugerenciasService.getQuickStats(tenantId, empresaId);
  }

  @Patch(':id/estado')
  async updateEstado(
    @Request() req,
    @Param('id') id: string,
    @Body('estado') estado: EstadoSugerencia
  ) {
    const tenantId = req.user.tenantId || '';
    return this.sugerenciasService.updateEstado(id, tenantId, estado);
  }

  @Post('trigger-job')
  async triggerJob() {
    // Solo para pruebas manuales o admins
    return this.sugerenciasService.generateDailySugerencias();
  }
}
