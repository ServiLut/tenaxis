import { Body, Controller, Headers, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto';
import { EnterpriseService } from './enterprise.service';

@UseGuards(JwtAuthGuard)
@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Post()
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() createEnterpriseDto: CreateEnterpriseDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.enterpriseService.create(
      createEnterpriseDto,
      req.user.sub,
      tenantId,
    );
  }
}
