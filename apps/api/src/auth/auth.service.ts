import { ConflictException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../generated/client/client';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.memberships[0]?.role || Role.OPERADOR,
      tenantId: user.memberships[0]?.tenantId,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
      },
    };
  }

  async register(dto: RegisterDto) {
    const { email, password, nombre, apellido, telefono, tipoDocumento, numeroDocumento } = dto;

    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // Verificar si el documento ya existe
    const existingDoc = await this.prisma.user.findUnique({
      where: { numeroDocumento },
    });

    if (existingDoc) {
      throw new ConflictException('El número de documento ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Crear el Usuario
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            nombre,
            apellido,
            telefono,
            tipoDocumento,
            numeroDocumento,
          },
        });

        // 2. Crear el Tenant
        const tenantName = `${nombre} ${apellido}`;
        const slug = `${nombre.toLowerCase()}-${apellido.toLowerCase()}-${Date.now()}`;
        
        const tenant = await tx.tenant.create({
          data: {
            nombre: tenantName,
            slug,
          },
        });

        // 3. Crear Empresa por defecto
        const empresa = await tx.empresa.create({
          data: {
            nombre: 'Sede Principal',
            tenantId: tenant.id,
          },
        });

        // 4. Crear Membresía como ADMIN
        await tx.tenantMembership.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            role: Role.ADMIN,
            activo: true,
            aprobado: true,
          },
        });

        // 5. Vincular Membresía con Empresa
        const membership = await tx.tenantMembership.findFirst({
            where: { userId: user.id, tenantId: tenant.id }
        });

        if (membership) {
            await tx.empresaMembership.create({
                data: {
                    tenantId: tenant.id,
                    membershipId: membership.id,
                    empresaId: empresa.id,
                }
            });
        }

        // Para el registro inicial, no creamos suscripción todavía si no hay planes definidos,
        // o podríamos crear un plan 'FREE' básico. 
        // Dado que Subscription.planId es obligatorio, buscaremos un plan o crearemos uno temporal.
        
        let plan = await tx.plan.findFirst();
        if (!plan) {
            plan = await tx.plan.create({
                data: {
                    nombre: 'Plan Inicial',
                    durationDays: 30,
                    maxUsers: 5,
                    maxOperators: 10,
                    maxEmpresas: 1,
                    price: 0,
                }
            });
        }

        await tx.subscription.create({
            data: {
                tenantId: tenant.id,
                planId: plan.id,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
                status: 'ACTIVE',
            }
        });

        return {
          message: 'Usuario registrado exitosamente',
          userId: user.id,
          tenantId: tenant.id,
        };
      });
    } catch (error) {
      console.error('Error in registration:', error);
      throw new InternalServerErrorException('Error al registrar el usuario');
    }
  }
}
