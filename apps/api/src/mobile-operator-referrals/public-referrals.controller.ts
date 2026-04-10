import { Controller, Get, Param } from '@nestjs/common';
import { MobileOperatorReferralsService } from './mobile-operator-referrals.service';

@Controller('public/referrals')
export class PublicReferralsController {
  constructor(
    private readonly mobileOperatorReferralsService: MobileOperatorReferralsService,
  ) {}

  @Get(':code')
  resolveCode(@Param('code') code: string) {
    return this.mobileOperatorReferralsService.resolvePublicCode(code);
  }
}
