import { Body, Controller, Post, UseGuards, Request, Get } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { SuAdminGuard } from '../auth/guards/su-admin.guard';

@Controller('tenants')
@UseGuards(SuAdminGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  async create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  async findAll() {
    return this.tenantsService.findAll();
  }
}
