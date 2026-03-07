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
import { OrdenesServicioService } from './ordenes-servicio.service';
import { CreateOrdenServicioDto } from './dto/create-orden-servicio.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
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
    @Query('empresaId') queryEmpresaId?: string,
    @Query('clienteId') clienteId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    const empresaId = queryEmpresaId || req.user.empresaId;
    const role = req.user.role;

    return this.ordenesServicioService.findAll(
      tenantId,
      empresaId,
      role,
      clienteId,
    );
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
    @Body() body: Record<string, any>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    const updateDto: Partial<CreateOrdenServicioDto> = { ...body };

    // Parse specific JSON fields if they are sent as strings in FormData
    if (typeof body.desglosePago === 'string') {
      try {
        updateDto.desglosePago = JSON.parse(body.desglosePago);
      } catch (e) {
        // Handle gracefully if needed
      }
    }

    if (file && body.uploadField) {
      const fieldToUpdate = body.uploadField as string;
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const folderMap: Record<string, string> = {
        "facturaElectronica": "facturaOrdenServicio",
        "comprobantePago": "comprobanteOrdenServicio",
        "evidenciaPath": "EvidenciaOrdenServicio"
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
        (updateDto as any)[fieldToUpdate] = fileId;
      }
      delete (updateDto as any).uploadField;
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
