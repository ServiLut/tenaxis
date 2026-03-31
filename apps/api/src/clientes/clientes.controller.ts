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
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { QueryClientesDashboardDto } from './dto/query-clientes-dashboard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
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
    return this.clientesService.findAll(req.user);
  }

  @Get('segmentacion')
  async getSegmented(@Request() req: RequestWithUser) {
    return this.clientesService.getSegmented(req.user);
  }

  @Get('dashboard-data')
  async getDashboardData(
    @Request() req: RequestWithUser,
    @Query() query: QueryClientesDashboardDto,
  ): Promise<unknown> {
    return this.clientesService.getDashboardData(req.user, undefined, query);
  }

  @Get(':id')
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.clientesService.findOne(id, req.user);
  }

  @Post('create')
  async create(
    @Request() req: RequestWithUser,
    @Body() dto: CreateClienteDto & { empresaId?: string },
  ) {
    // allow the frontend to specify the target empresaId, fallback to the request context
    const empresaId = dto.empresaId || req.user.empresaId;
    return this.clientesService.create(req.user, dto, empresaId);
  }

  @Patch(':id')
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateClienteDto>,
  ) {
    return this.clientesService.update(id, req.user, dto);
  }

  @Delete(':id')
  async remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.clientesService.remove(id, req.user);
  }
}
