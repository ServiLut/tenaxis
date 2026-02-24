import { Module } from '@nestjs/common';
import { OrdenesServicioController } from './ordenes-servicio.controller';
import { OrdenesServicioService } from './ordenes-servicio.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OrdenesServicioController],
  providers: [OrdenesServicioService],
})
export class OrdenesServicioModule {}
