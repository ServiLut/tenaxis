import {
  Controller,
  Post,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  Query,
  UnauthorizedException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  OrdenesServicioService,
  ServiciosKpiPayload,
} from './ordenes-servicio.service';
import { CreateOrdenServicioDto } from './dto/create-orden-servicio.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { QueryOrdenesServicioDto } from './dto/query-ordenes-servicio.dto';
import {
  ConfirmUploadedFilesDto,
  CreateSignedUploadUrlDto,
} from './dto/upload-orden-servicio.dto';
import {
  NotifyLiquidationDto,
  NotifyOperatorDto,
} from './dto/notify-webhook.dto';

interface RequestWithUser extends Request {
  user: JwtPayload;
}

@Controller('ordenes-servicio')
@UseGuards(JwtAuthGuard)
export class OrdenesServicioController {
  constructor(
    private readonly ordenesServicioService: OrdenesServicioService,
  ) {}

  @Post()
  create(
    @Req() req: RequestWithUser,
    @Body() createDto: CreateOrdenServicioDto,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    // Asignar creador si no viene en el DTO
    if (!createDto.creadoPorId && req.user.membershipId) {
      createDto.creadoPorId = req.user.membershipId;
    }

    return this.ordenesServicioService.create(tenantId, createDto);
  }

  @Post(':id/evidencias')
  @UseInterceptors(FilesInterceptor('files'))
  async addEvidencias(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }
    return this.ordenesServicioService.addEvidence(tenantId, id, files);
  }

  @Get()
  findAll(
    @Req() req: RequestWithUser,
    @Query() query: QueryOrdenesServicioDto,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    const empresaId = query.empresaId || req.user.empresaId;
    const role = req.user.role;

    return this.ordenesServicioService.findAll(
      tenantId,
      empresaId,
      role,
      query,
    );
  }

  @Get('kpis')
  getKpis(
    @Req() req: RequestWithUser,
    @Query() query: QueryOrdenesServicioDto,
  ): Promise<ServiciosKpiPayload> {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    const empresaId = query.empresaId || req.user.empresaId;
    const role = req.user.role;
    return this.ordenesServicioService.getKpis(
      tenantId,
      empresaId,
      role,
      query,
    );
  }

  @Post(':id/uploads/signed-url')
  createSignedUploadUrl(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: CreateSignedUploadUrlDto,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }
    return this.ordenesServicioService.createSignedUploadUrl(tenantId, id, dto);
  }

  @Post(':id/uploads/confirm')
  confirmUpload(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: ConfirmUploadedFilesDto,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }
    return this.ordenesServicioService.confirmUploadedFiles(tenantId, id, dto);
  }

  @Post('notifications/liquidation')
  notifyLiquidation(@Body() dto: NotifyLiquidationDto) {
    return this.ordenesServicioService.notifyLiquidationWebhook(dto);
  }

  @Post('notifications/operator')
  notifyOperator(@Body() dto: NotifyOperatorDto) {
    return this.ordenesServicioService.notifyOperatorWebhook(dto);
  }

  @Get(':id')
  findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }
    return this.ordenesServicioService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateOrdenServicioDto>,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }
    return this.ordenesServicioService.update(
      tenantId,
      id,
      updateDto,
      req.user,
    );
  }

  @Delete(':id')
  remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }
    return this.ordenesServicioService.remove(tenantId, id);
  }
}
