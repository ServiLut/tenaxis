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
  UseInterceptors,
  UsePipes,
  UploadedFile,
  ValidationPipe,
} from '@nestjs/common';
import { ContabilidadService } from './contabilidad.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseService } from '../supabase/supabase.service';
import { GenerateMonitoringPayrollDto } from './generate-monitoring-payroll.dto';

interface RequestWithUser extends Request {
  user: JwtPayload;
}

@Controller('finanzas')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class FinanzasController {
  constructor(
    private readonly contabilidadService: ContabilidadService,
    private readonly supabaseService: SupabaseService,
  ) {}

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

  @Get('balance')
  getBalance(
    @Req() req: RequestWithUser,
    @Query('empresaId') queryEmpresaId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant ID missing');
    const empresaId = queryEmpresaId || req.user.empresaId;
    return this.contabilidadService.getAccountingBalance(tenantId, empresaId);
  }

  @Get('egresos')
  getEgresos(
    @Req() req: RequestWithUser,
    @Query('empresaId') queryEmpresaId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant ID missing');
    const empresaId = queryEmpresaId || req.user.empresaId;
    return this.contabilidadService.getEgresos(tenantId, empresaId);
  }

  @Get('nominas')
  getNominas(
    @Req() req: RequestWithUser,
    @Query('empresaId') queryEmpresaId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant ID missing');
    const empresaId = queryEmpresaId || req.user.empresaId;
    return this.contabilidadService.getNominas(tenantId, empresaId);
  }

  @Get('anticipos')
  getAnticipos(
    @Req() req: RequestWithUser,
    @Query('empresaId') queryEmpresaId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant ID missing');
    const empresaId = queryEmpresaId || req.user.empresaId;
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

    return this.contabilidadService.createEgreso(tenantId, data);
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

    return this.contabilidadService.createAnticipo(tenantId, data);
  }

  @Post('registrar-consignacion')
  @UseInterceptors(FileInterceptor('comprobanteFile'))
  async register(
    @Req() req: RequestWithUser,
    @Body()
    data: {
      tecnicoId: string;
      empresaId: string;
      valorConsignado: string;
      referenciaBanco: string;
      ordenIds: string; // Will come as JSON string
      fechaConsignacion: string;
      observacion?: string;
    },
    @UploadedFile() comprobanteFile: Express.Multer.File,
  ) {
    const tenantId = req.user.tenantId;
    const membershipId = req.user.membershipId;

    if (!tenantId || !membershipId) {
      throw new UnauthorizedException('Auth data missing');
    }

    let fileId = '';
    if (comprobanteFile) {
      const fileExt = comprobanteFile.originalname.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `comprobanteOrdenServicio/${fileName}`;

      fileId =
        (await this.supabaseService.uploadFile(
          filePath,
          comprobanteFile.buffer,
          comprobanteFile.mimetype,
          'tenaxis-docs',
        )) || '';
    }

    return this.contabilidadService.registrarConsignacion(
      tenantId,
      membershipId,
      {
        tecnicoId: data.tecnicoId,
        empresaId: data.empresaId,
        valorConsignado: Number(data.valorConsignado),
        referenciaBanco: data.referenciaBanco,
        comprobantePath: fileId,
        ordenIds: JSON.parse(data.ordenIds) as string[],
        fechaConsignacion: data.fechaConsignacion,
        observacion: data.observacion,
      },
    );
  }
}
