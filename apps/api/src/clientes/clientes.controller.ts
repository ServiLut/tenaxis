import {
  Body,
  Controller,
  Get,
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

  @Get()
  async findAll(@Request() req: RequestWithUser) {
    return this.clientesService.findAll(req.user.tenantId || '');
  }

  @Post()
  async create(@Request() req: RequestWithUser, @Body() dto: CreateClienteDto) {
    const tenantId = req.user.tenantId || '';
    const userId = req.user.sub;
    return this.clientesService.create(tenantId, userId, dto);
  }
}
