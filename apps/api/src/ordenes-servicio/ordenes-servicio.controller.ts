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
  UploadedFile,
} from '@nestjs/common';
import { Request } from 'express';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  OrdenesServicioService,
  ServiciosKpiPayload,
} from './ordenes-servicio.service';
import { CreateOrdenServicioDto } from './dto/create-orden-servicio.dto';
import { CompleteFollowUpDto } from './dto/complete-follow-up.dto';
import { CreateFollowUpOverrideDto } from './dto/create-follow-up-override.dto';
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
import { SupabaseService } from '../supabase/supabase.service';

interface RequestWithUser extends Request {
  user: JwtPayload;
}

@Controller('ordenes-servicio')
@UseGuards(JwtAuthGuard)
export class OrdenesServicioController {
  constructor(
    private readonly ordenesServicioService: OrdenesServicioService,
    private readonly supabaseService: SupabaseService,
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
    if (req.user.membershipId) {
      createDto.creadoPorId = req.user.membershipId;
    }

    return this.ordenesServicioService.create(tenantId, createDto, req.user);
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

  @Get('follow-ups/my-status')
  getMyFollowUpStatus(
    @Req() req: RequestWithUser,
    @Query('empresaId') empresaId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    return this.ordenesServicioService.getMyFollowUpStatus(
      tenantId,
      req.user,
      empresaId || req.user.empresaId,
    );
  }

  @Get('follow-up-overrides')
  getFollowUpOverrides(
    @Req() req: RequestWithUser,
    @Query('empresaId') empresaId?: string,
    @Query('membershipId') membershipId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    return this.ordenesServicioService.listFollowUpOverrides(
      tenantId,
      req.user,
      empresaId || req.user.empresaId,
      membershipId,
    );
  }

  @Post('follow-up-overrides')
  createFollowUpOverride(
    @Req() req: RequestWithUser,
    @Body() dto: CreateFollowUpOverrideDto,
    @Query('empresaId') empresaId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    return this.ordenesServicioService.createFollowUpOverride(
      tenantId,
      req.user,
      empresaId || req.user.empresaId,
      dto,
    );
  }

  @Post('follow-ups/:id/complete')
  completeFollowUp(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: CompleteFollowUpDto,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    return this.ordenesServicioService.completeFollowUp(
      tenantId,
      id,
      dto,
      req.user,
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
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    const updateDto = body as unknown as Partial<CreateOrdenServicioDto> & {
      uploadField?: string;
    };

    // Parse specific JSON fields if they are sent as strings in FormData
    if (typeof body.desglosePago === 'string') {
      try {
        updateDto.desglosePago = JSON.parse(body.desglosePago) as any[];
      } catch {
        // Handle gracefully
      }
    }

    if (file && typeof body.uploadField === 'string') {
      const fieldToUpdate = body.uploadField;
      const fileExt = file.originalname.split('.').pop() || '';
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const folderMap: Record<string, string> = {
        facturaElectronica: 'facturaOrdenServicio',
        comprobantePago: 'comprobanteOrdenServicio',
        evidenciaPath: 'EvidenciaOrdenServicio',
      };

      const folder = folderMap[fieldToUpdate] || 'EvidenciaOrdenServicio';
      const filePath = `${folder}/${fileName}`;

      const fileId = await this.supabaseService.uploadFile(
        filePath,
        file.buffer,
        file.mimetype,
        'tenaxis-docs',
      );

      if (fileId) {
        if (fieldToUpdate === 'facturaElectronica')
          updateDto.facturaElectronica = fileId;
        if (fieldToUpdate === 'comprobantePago')
          updateDto.comprobantePago = fileId;
        if (fieldToUpdate === 'evidenciaPath') updateDto.evidenciaPath = fileId;
      }
    }

    // Clean up temporary field used for routing the file
    if ('uploadField' in updateDto) {
      delete updateDto.uploadField;
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
