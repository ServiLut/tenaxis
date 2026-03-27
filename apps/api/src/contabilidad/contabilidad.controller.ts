import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Query,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ContabilidadService } from './contabilidad.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { Request } from 'express';
import { GenerateMonitoringPayrollDto } from './generate-monitoring-payroll.dto';
import { RegistrarConsignacionDto } from './registrar-consignacion.dto';
import { resolveScopedEmpresaId } from '../common/utils/access-control.util';

interface RequestWithUser extends Request {
  user: JwtPayload;
}

@Controller('finanzas')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class FinanzasController {
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

    const empresaId = resolveScopedEmpresaId(req.user, queryEmpresaId);
    return this.contabilidadService.getRecaudoTecnicos(tenantId, empresaId);
  }

  @Get('balance')
  getBalance(
    @Req() req: RequestWithUser,
    @Query('empresaId') queryEmpresaId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant ID missing');
    const empresaId = resolveScopedEmpresaId(req.user, queryEmpresaId);
    return this.contabilidadService.getAccountingBalance(tenantId, empresaId);
  }

  @Get('egresos')
  getEgresos(
    @Req() req: RequestWithUser,
    @Query('empresaId') queryEmpresaId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant ID missing');
    const empresaId = resolveScopedEmpresaId(req.user, queryEmpresaId);
    return this.contabilidadService.getEgresos(tenantId, empresaId);
  }

  @Get('nominas')
  getNominas(
    @Req() req: RequestWithUser,
    @Query('empresaId') queryEmpresaId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant ID missing');
    const empresaId = resolveScopedEmpresaId(req.user, queryEmpresaId);
    return this.contabilidadService.getNominas(tenantId, empresaId);
  }

  @Get('anticipos')
  getAnticipos(
    @Req() req: RequestWithUser,
    @Query('empresaId') queryEmpresaId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant ID missing');
    const empresaId = resolveScopedEmpresaId(req.user, queryEmpresaId);
    return this.contabilidadService.getAnticipos(tenantId, empresaId);
  }

  @Post('nominas/generar-desde-monitoreo')
  generateMonitoringPayroll(
    @Req() req: RequestWithUser,
    @Body() dto: GenerateMonitoringPayrollDto,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID missing');
    }

    if (
      !dto.includeAllEligible &&
      (!dto.membershipIds || dto.membershipIds.length === 0)
    ) {
      throw new BadRequestException(
        'Debe enviar membershipIds o activar includeAllEligible',
      );
    }

    return this.contabilidadService.generatePayrollFromMonitoring(
      tenantId,
      dto,
    );
  }

  @Post('registrar-egreso')
  createEgreso(
    @Req() req: RequestWithUser,
    @Body()
    data: {
      titulo: string;
      monto: number;
      razon: string;
      categoria: string;
      membershipId?: string;
      empresaId: string;
    },
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    return this.contabilidadService.createEgreso(tenantId, {
      ...data,
      empresaId: resolveScopedEmpresaId(req.user, data.empresaId),
    });
  }

  @Post('registrar-anticipo')
  createAnticipo(
    @Req() req: RequestWithUser,
    @Body()
    data: {
      membershipId: string;
      monto: number;
      razon: string;
      empresaId: string;
    },
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    return this.contabilidadService.createAnticipo(tenantId, {
      ...data,
      empresaId: resolveScopedEmpresaId(req.user, data.empresaId),
    });
  }

  @Post('registrar-consignacion')
  async register(
    @Req() req: RequestWithUser,
    @Body() data: RegistrarConsignacionDto,
  ) {
    const tenantId = req.user.tenantId;
    const membershipId = req.user.membershipId;

    if (!tenantId || !membershipId) {
      throw new UnauthorizedException('Auth data missing');
    }

    return this.contabilidadService.registrarConsignacion(
      tenantId,
      membershipId,
      {
        tecnicoId: data.tecnicoId,
        empresaId: resolveScopedEmpresaId(req.user, data.empresaId),
        valorConsignado: data.valorConsignado,
        referenciaBanco: data.referenciaBanco,
        comprobantePath: data.comprobantePath,
        ordenIds: data.ordenIds,
        fechaConsignacion: data.fechaConsignacion,
        observacion: data.observacion,
      },
    );
  }
}
