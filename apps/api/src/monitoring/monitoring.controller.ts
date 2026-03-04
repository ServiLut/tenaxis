import { Controller, Get, Post, Body, UseGuards, Request, UnauthorizedException, Param } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../auth/auth.service';

interface RequestWithUser extends ExpressRequest {
  user: JwtPayload;
}

@Controller('monitoring')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('sessions')
  async findAllSessions(@Request() req: RequestWithUser) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('No perteneces a ningún conglomerado');
    }
    return this.monitoringService.findAllSessions(req.user.tenantId);
  }

  @Get('stats')
  async getStats(@Request() req: RequestWithUser) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('No perteneces a ningún conglomerado');
    }
    return this.monitoringService.getGlobalStats(req.user.tenantId);
  }

  @Get('audits')
  async findAllAudits(@Request() req: RequestWithUser) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('No perteneces a ningún conglomerado');
    }
    return this.monitoringService.findAllAudits(req.user.tenantId);
  }

  @Get('recent-logs')
  async findRecentLogs(@Request() req: RequestWithUser) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('No perteneces a ningún conglomerado');
    }
    return this.monitoringService.findRecentLogs(req.user.tenantId);
  }

  @Get('logs/:membershipId')
  async getMemberLogs(@Request() req: RequestWithUser, @Param('membershipId') membershipId: string) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('No perteneces a ningún conglomerado');
    }
    return this.monitoringService.getMemberLogs(req.user.tenantId, membershipId);
  }

  @Post('event')
  async recordEvent(@Request() req: RequestWithUser, @Body() body: { tipo: string; descripcion?: string; ruta?: string }) {
    if (!req.user.sesionId) {
      throw new UnauthorizedException('No hay una sesión activa vinculada a tu token');
    }
    return this.monitoringService.recordEvent(req.user.sesionId, body.tipo, body.descripcion, body.ruta);
  }

  @Post('heartbeat')
  async heartbeat(@Request() req: RequestWithUser, @Body() body: { inactiveMinutes?: number }) {
    if (!req.user.sesionId) {
      throw new UnauthorizedException('No hay una sesión activa');
    }
    
    if (body.inactiveMinutes && body.inactiveMinutes > 0) {
      await this.monitoringService.updateInactivityTime(req.user.sesionId, body.inactiveMinutes);
    }
    
    return { success: true };
  }
}
