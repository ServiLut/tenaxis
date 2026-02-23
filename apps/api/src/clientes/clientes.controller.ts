import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: JwtPayload;
}

@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get('list')
  async findAll(@Request() req: RequestWithUser) {
    const tenantId = req.user.tenantId || '';
    const empresaId = req.user.empresaId;
    const role = req.user.role;
    return this.clientesService.findAll(tenantId, empresaId, role);
  }

  @Get(':id')
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = req.user.tenantId || '';
    return this.clientesService.findOne(id, tenantId);
  }

  @Post('create')
  async create(
    @Request() req: RequestWithUser,
    @Body() dto: CreateClienteDto & { empresaId?: string },
  ) {
    const tenantId = req.user.tenantId || '';
    const userId = req.user.sub;
    // allow the frontend to specify the target empresaId, fallback to the request context
    const empresaId = dto.empresaId || req.user.empresaId;
    return this.clientesService.create(tenantId, userId, dto, empresaId);
  }

  @Patch(':id')
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateClienteDto>,
  ) {
    const tenantId = req.user.tenantId || '';
    const userId = req.user.sub;
    return this.clientesService.update(id, tenantId, userId, dto);
  }

  @Delete(':id')
  async remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = req.user.tenantId || '';
    return this.clientesService.remove(id, tenantId);
  }
}
