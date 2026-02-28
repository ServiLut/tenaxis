import {
  Controller,
  Post,
  Get,
  Body,
  Patch,
  Param,
  Req,
  UseGuards,
  Query,
  UnauthorizedException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { OrdenesServicioService } from './ordenes-servicio.service';
import { CreateOrdenServicioDto } from './dto/create-orden-servicio.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';

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
    
    return this.ordenesServicioService.findAll(tenantId, empresaId, role, clienteId);
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
    return this.ordenesServicioService.update(tenantId, id, updateDto, req.user);
  }
}
