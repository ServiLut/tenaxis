import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto';
import { UpdateEnterpriseDto } from './dto/update-enterprise.dto';
import { EnterpriseService } from './enterprise.service';
import { JwtPayload } from '../auth/auth.service';

@UseGuards(JwtAuthGuard)
@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Post('create')
  create(
    @Body() createEnterpriseDto: CreateEnterpriseDto,
    @Request() req: { user: JwtPayload },
  ) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('Usuario no tiene un tenant asignado');
    }
    return this.enterpriseService.create(
      createEnterpriseDto,
      req.user.sub,
      req.user.tenantId,
    );
  }

  @Get()
  findAll(@Request() req: { user: JwtPayload }) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('Usuario no tiene un tenant asignado');
    }
    return this.enterpriseService.findAll(req.user.sub, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEnterpriseDto: UpdateEnterpriseDto,
    @Request() req: { user: JwtPayload },
  ) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('Usuario no tiene un tenant asignado');
    }
    return this.enterpriseService.update(
      id,
      updateEnterpriseDto,
      req.user.sub,
      req.user.tenantId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('Usuario no tiene un tenant asignado');
    }
    return this.enterpriseService.remove(id, req.user.sub, req.user.tenantId);
  }
}
