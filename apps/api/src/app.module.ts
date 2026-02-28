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
import { EnterpriseModule } from './enterprise/enterprise.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EnterpriseInterceptor } from './common/interceptors/enterprise.interceptor';
import { OrdenesServicioModule } from './ordenes-servicio/ordenes-servicio.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ContabilidadModule } from './contabilidad/contabilidad.module';

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
    EnterpriseModule,
    OrdenesServicioModule,
    SupabaseModule,
    ContabilidadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: EnterpriseInterceptor,
    },
  ],
})
export class AppModule {}
