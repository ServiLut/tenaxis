import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { TenantsModule } from './tenants/tenants.module';
import { PlansModule } from './plans/plans.module';
import { ClientesModule } from './clientes/clientes.module';
import { ConfigClientesModule } from './config-clientes/config-clientes.module';
import { GeoModule } from './geo/geo.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    PlansModule,
    ClientesModule,
    ConfigClientesModule,
    GeoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
