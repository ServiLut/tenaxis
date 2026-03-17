import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Param,
  Patch,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JoinTenantDto } from './dto/join-tenant.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { TeamPerformanceQueryDto } from './dto/team-performance-query.dto';
import { TeamMemberDetailQueryDto } from './dto/team-member-detail-query.dto';
import { SuAdminGuard } from '../auth/guards/su-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: JwtPayload;
}

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @UseGuards(SuAdminGuard)
  async create(@Body() createTenantDto: CreateTenantDto) {
    return await this.tenantsService.create(createTenantDto);
  }

  @Get()
  @UseGuards(SuAdminGuard)
  async findAll() {
    return await this.tenantsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    // Si no es SU_ADMIN, solo puede ver su propio tenant
    const allowedUuids = (process.env.ALLOWED_TENANT_ADMINS || '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    const isSuAdmin = allowedUuids.includes(req.user.sub);

    if (!isSuAdmin && req.user.tenantId !== id) {
      throw new UnauthorizedException(
        'No tienes permiso para ver este conglomerado',
      );
    }
    return await this.tenantsService.findOne(id);
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  async join(
    @Request() req: RequestWithUser,
    @Body() joinTenantDto: JoinTenantDto,
  ) {
    return await this.tenantsService.joinBySlug(req.user.sub, joinTenantDto);
  }

  @Get(':tenantId/pending-memberships')
  @UseGuards(JwtAuthGuard)
  async getPendingMemberships(@Request() req: RequestWithUser) {
    // Para simplificar, asumimos que el usuario solo puede ver los de su tenant actual
    // En una implementación final, validaríamos que sea SU_ADMIN de ese tenant
    if (!req.user.tenantId) {
      throw new UnauthorizedException('No perteneces a ningún conglomerado');
    }
    return await this.tenantsService.getPendingMemberships(req.user.tenantId);
  }

  @Get(':tenantId/memberships')
  @UseGuards(JwtAuthGuard)
  async findAllMemberships(
    @Request() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('No perteneces a ningún conglomerado');
    }
    // TODO: Validar que sea ADMIN o SU_ADMIN del tenant
    return await this.tenantsService.findAllMemberships(
      req.user.tenantId,
      startDate,
      endDate,
    );
  }

  @Get(':tenantId/team/performance')
  @UseGuards(JwtAuthGuard)
  async getTeamPerformance(
    @Request() req: RequestWithUser,
    @Param('tenantId') tenantId: string,
    @Query() query: TeamPerformanceQueryDto,
  ) {
    const isGlobalScope = tenantId === 'global' && req.user.isGlobalSuAdmin;

    if (!isGlobalScope && (!req.user.tenantId || req.user.tenantId !== tenantId)) {
      throw new UnauthorizedException(
        'No tienes permisos para acceder a este conglomerado',
      );
    }

    return await this.tenantsService.getTeamPerformance(
      tenantId,
      req.user,
      query,
    );
  }

  @Get(':tenantId/team/members/:membershipId/detail')
  @UseGuards(JwtAuthGuard)
  async getTeamMemberDetail(
    @Request() req: RequestWithUser,
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Query() query: TeamMemberDetailQueryDto,
  ) {
    const isGlobalScope = tenantId === 'global' && req.user.isGlobalSuAdmin;

    if (!isGlobalScope && (!req.user.tenantId || req.user.tenantId !== tenantId)) {
      throw new UnauthorizedException(
        'No tienes permisos para acceder a este conglomerado',
      );
    }

    return await this.tenantsService.getTeamMemberDetail(
      tenantId,
      membershipId,
      req.user,
      query,
    );
  }

  @Post(':tenantId/memberships')
  @UseGuards(JwtAuthGuard)
  async inviteMember(
    @Request() req: RequestWithUser,
    @Param('tenantId') tenantId: string,
    @Body() dto: InviteMemberDto,
  ) {
    if (!req.user.tenantId || req.user.tenantId !== tenantId) {
      throw new UnauthorizedException(
        'No tienes permisos para invitar miembros a este conglomerado',
      );
    }

    // TODO: Validar que el usuario que invita sea ADMIN o SU_ADMIN
    return await this.tenantsService.inviteMember(tenantId, dto);
  }

  @Post('memberships/:membershipId/approve')
  @UseGuards(JwtAuthGuard)
  async approveMembership(@Param('membershipId') membershipId: string) {
    return await this.tenantsService.approveMembership(membershipId);
  }

  @Post('memberships/:membershipId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectMembership(@Param('membershipId') membershipId: string) {
    return await this.tenantsService.rejectMembership(membershipId);
  }

  @Patch('memberships/:membershipId')
  @UseGuards(JwtAuthGuard)
  async updateMembership(
    @Request() req: RequestWithUser,
    @Param('membershipId') membershipId: string,
    @Body() data: UpdateMembershipDto,
  ) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('No perteneces a ningún conglomerado');
    }

    return await this.tenantsService.updateMembership(
      membershipId,
      req.user.tenantId,
      data,
    );
  }
}
