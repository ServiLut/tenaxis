import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: JwtPayload;
}

@Controller('productos')
@UseGuards(JwtAuthGuard)
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get('stock')
  async getStock(@Request() req: RequestWithUser) {
    return this.productosService.findStock(req.user);
  }

  @Get('solicitudes')
  async getSolicitudes(@Request() req: RequestWithUser) {
    return this.productosService.findSolicitudes(req.user);
  }

  @Get('proveedores')
  async getProveedores(@Request() req: RequestWithUser) {
    return this.productosService.findProveedores(req.user);
  }
}
