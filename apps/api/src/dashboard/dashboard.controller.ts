import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { Role } from '../generated/client/client';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    tenantId: string;
    role: Role;
    empresaId?: string;
  };
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(
    @Request() req: RequestWithUser,
    @Query('empresaId') empresaId?: string,
  ) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('No perteneces a ningún conglomerado');
    }

    // Use empresaId from query if provided, otherwise from interceptor/user context
    const targetEmpresaId = empresaId || req.user.empresaId;

    return this.dashboardService.getStats(req.user.tenantId, targetEmpresaId);
  }
}
