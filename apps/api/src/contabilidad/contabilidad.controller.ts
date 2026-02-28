import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ContabilidadService } from './contabilidad.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: JwtPayload;
}

@Controller('contabilidad')
@UseGuards(JwtAuthGuard)
export class ContabilidadController {
  constructor(private readonly contabilidadService: ContabilidadService) {}

  @Get('recaudo-tecnicos')
  findAll(
    @Req() req: RequestWithUser,
    @Query('empresaId') queryEmpresaId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }
    
    const empresaId = queryEmpresaId || req.user.empresaId;
    return this.contabilidadService.getRecaudoTecnicos(tenantId, empresaId);
  }

  @Post('registrar-consignacion')
  register(
    @Req() req: RequestWithUser,
    @Body() data: {
      tecnicoId: string;
      empresaId: string;
      valorConsignado: number;
      referenciaBanco: string;
      comprobantePath: string;
      ordenIds: string[];
      fechaConsignacion: string;
      observacion?: string;
    },
  ) {
    const tenantId = req.user.tenantId;
    const membershipId = req.user.membershipId;
    
    if (!tenantId || !membershipId) {
      throw new UnauthorizedException('Auth data missing');
    }

    return this.contabilidadService.registrarConsignacion(
      tenantId,
      membershipId,
      data,
    );
  }
}
