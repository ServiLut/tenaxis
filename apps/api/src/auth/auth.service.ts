import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../generated/client/client';
import { JwtService } from '@nestjs/jwt';
import { MonitoringService } from '../monitoring/monitoring.service';
import { JwtPayload } from './jwt-payload.interface';
import { resolveEffectiveRoleState } from '../common/utils/dev-role-override.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => MonitoringService))
    private monitoringService: MonitoringService,
  ) {}

  private isGlobalSuAdmin(userId: string): boolean {
    const allowedUuids = (process.env.ALLOWED_TENANT_ADMINS || '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    return allowedUuids.includes(userId);
  }

  async login(dto: LoginDto, ip?: string, dispositivo?: string) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            tenant: true,
            empresaMemberships: {
              where: { activo: true, deletedAt: null },
              select: { empresaId: true },
            },
          },
        },
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isGlobalSuAdmin = this.isGlobalSuAdmin(user.id);

    // Priorizar membresías activas
    const approvedMembership = user.memberships.find(
      (m) => m.aprobado || m.role === Role.SU_ADMIN,
    );
    const pendingMembership = user.memberships.find(
      (m) => !m.aprobado && m.role !== Role.SU_ADMIN,
    );

    let sesionId: string | undefined;

    // Registrar sesión de actividad si hay membresía
    if (approvedMembership) {
      const session = await this.monitoringService.startSession(
        approvedMembership.tenantId,
        approvedMembership.id,
        ip,
        dispositivo,
      );
      sesionId = session?.id;

      if (sesionId) {
        await this.monitoringService.recordEvent(
          sesionId,
          'LOGIN',
          'El usuario inició sesión en el sistema',
          '/login',
        );
      }
    }

    const role =
      approvedMembership?.role ||
      (isGlobalSuAdmin ? Role.SU_ADMIN : Role.OPERADOR);
    const empresaIds =
      approvedMembership?.empresaMemberships.map((m) => m.empresaId) || [];

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role,
      tenantId: approvedMembership?.tenantId,
      membershipId: approvedMembership?.id,
      empresaId: empresaIds.length === 1 ? empresaIds[0] : undefined,
      empresaIds,
      sesionId,
      isGlobalSuAdmin,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        role,
        tenantId: approvedMembership?.tenantId,
        membershipId: approvedMembership?.id,
        sesionId,
        isGlobalSuAdmin,
        hasPendingRequest: !!pendingMembership && !approvedMembership,
      },
    };
  }

  async getProfile(token: string, enterpriseId?: string, testRole?: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const devRoleState = resolveEffectiveRoleState(
        {
          role: payload.role,
          isGlobalSuAdmin: this.isGlobalSuAdmin(payload.sub),
        },
        testRole,
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          memberships: {
            where: payload.membershipId
              ? { id: payload.membershipId }
              : { aprobado: true },
            include: {
              cuentasPago: {
                where: payload.tenantId
                  ? {
                      tenantId: payload.tenantId,
                      ...(enterpriseId ? { empresaId: enterpriseId } : {}),
                    }
                  : undefined,
                orderBy: {
                  createdAt: 'desc',
                },
              },
              empresaMemberships: {
                where: {
                  activo: true,
                  deletedAt: null,
                },
                select: {
                  empresaId: true,
                },
              },
            },
          },
        },
      });

      const membership = user?.memberships?.[0];
      const empresaIds =
        membership?.empresaMemberships.map((m) => m.empresaId) || [];
      const cuentaPago =
        membership?.cuentasPago?.[0] ||
        (enterpriseId
          ? undefined
          : membership?.cuentasPago?.find((item) => item.valorHora !== null));

      return {
        ...payload,
        role: devRoleState.role,
        id: user?.id || payload.sub,
        email: user?.email || payload.email,
        nombre: user?.nombre,
        apellido: user?.apellido,
        telefono: user?.telefono,
        tipoDocumento: user?.tipoDocumento,
        numeroDocumento: user?.numeroDocumento,
        banco: cuentaPago?.banco || undefined,
        tipoCuenta: cuentaPago?.tipoCuenta || undefined,
        numeroCuenta: cuentaPago?.numeroCuenta || undefined,
        valorHora:
          cuentaPago?.valorHora !== null && cuentaPago?.valorHora !== undefined
            ? Number(cuentaPago.valorHora)
            : undefined,
        empresaId:
          enterpriseId ||
          payload.empresaId ||
          (empresaIds.length === 1 ? empresaIds[0] : undefined),
        empresaIds:
          empresaIds.length > 0 ? empresaIds : payload.empresaIds || [],
        isGlobalSuAdmin: devRoleState.isGlobalSuAdmin,
      };
    } catch {
      throw new UnauthorizedException();
    }
  }

  async updateTestRole(userId: string, role: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Not allowed in production');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { aprobado: true },
        },
      },
    });

    if (!user || user.memberships.length === 0) {
      if (this.isGlobalSuAdmin(userId)) {
        return { success: true, role };
      }
      throw new ConflictException('No active membership found');
    }

    const membership = user.memberships[0];

    if (!membership) {
      if (this.isGlobalSuAdmin(userId)) {
        return { success: true, role };
      }
      throw new ConflictException('No active membership found');
    }

    await this.prisma.tenantMembership.update({
      where: { id: membership.id },
      data: { role: role as Role },
    });

    return { success: true, role };
  }

  async register(dto: RegisterDto) {
    const {
      email,
      password,
      nombre,
      apellido,
      telefono,
      tipoDocumento,
      numeroDocumento,
    } = dto;

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
      const user = await this.prisma.user.create({
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

      return {
        message:
          'Usuario registrado exitosamente. Ahora puedes unirte a una organización.',
        userId: user.id,
      };
    } catch (error) {
      console.error('Error in registration:', error);
      throw new InternalServerErrorException('Error al registrar el usuario');
    }
  }
}
