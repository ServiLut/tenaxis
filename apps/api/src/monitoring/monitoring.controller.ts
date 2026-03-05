import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
  Param,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MonitoringScopeGuard } from './guards/monitoring-scope.guard';
import { GetScope } from './decorators/get-scope.decorator';
import { MonitoringScope } from './types';
import {
  RecordEventDto,
  HeartbeatDto,
  MonitoringPaginationDto,
} from './dto/monitoring.dto';
import { JwtPayload } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: JwtPayload;
}

@Controller('monitoring')
@UseGuards(JwtAuthGuard, MonitoringScopeGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('sessions')
  async findAllSessions(@GetScope() scope: MonitoringScope) {
    return this.monitoringService.findAllSessions(scope);
  }

  @Get('stats')
  async getStats(@GetScope() scope: MonitoringScope) {
    return this.monitoringService.getGlobalStats(scope);
  }

  @Get('alerts')
  async getAlerts(@GetScope() scope: MonitoringScope) {
    return this.monitoringService.getAlerts(scope);
  }

  @Get('metrics')
  async getMetrics(@GetScope() scope: MonitoringScope) {
    return this.monitoringService.getOperationMetrics(scope);
  }

  @Get('executive-audit')
  async getExecutiveAudit(@GetScope() scope: MonitoringScope) {
    return this.monitoringService.getExecutiveAuditMetrics(scope);
  }

  @Get('audits')
  async findAllAudits(
    @GetScope() scope: MonitoringScope,
    @Query() query: MonitoringPaginationDto,
  ) {
    return this.monitoringService.findAllAudits(
      scope,
      query.page || 1,
      query.limit || 20,
    );
  }

  @Get('recent-logs')
  async findRecentLogs(@GetScope() scope: MonitoringScope) {
    return this.monitoringService.findRecentLogs(scope);
  }

  @Get('logs/:membershipId')
  async getMemberLogs(
    @GetScope() scope: MonitoringScope,
    @Param('membershipId') membershipId: string,
  ) {
    return this.monitoringService.getMemberLogs(scope, membershipId);
  }

  @Post('event')
  async recordEvent(
    @Request() req: RequestWithUser,
    @Body() dto: RecordEventDto,
  ) {
    if (!req.user.sesionId) {
      throw new UnauthorizedException(
        'No hay una sesión activa vinculada a tu token',
      );
    }
    return this.monitoringService.recordEvent(
      req.user.sesionId,
      dto.tipo,
      dto.descripcion,
      dto.ruta,
    );
  }

  @Post('heartbeat')
  async heartbeat(@Request() req: RequestWithUser, @Body() dto: HeartbeatDto) {
    if (!req.user.sesionId) {
      throw new UnauthorizedException('No hay una sesión activa');
    }

    if (dto.inactiveMinutes && dto.inactiveMinutes > 0) {
      await this.monitoringService.updateInactivityTime(
        req.user.sesionId,
        dto.inactiveMinutes,
      );
    } else {
      await this.monitoringService.refreshSession(req.user.sesionId);
    }

    return { success: true };
  }
}
