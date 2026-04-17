import { Module } from '@nestjs/common';
import { ContabilidadService } from './contabilidad.service';
import { FinanzasController } from './contabilidad.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';

@Module({
  imports: [PrismaModule, AuthModule, PushNotificationsModule],
  controllers: [FinanzasController],
  providers: [ContabilidadService],
  exports: [ContabilidadService],
})
export class ContabilidadModule {}
