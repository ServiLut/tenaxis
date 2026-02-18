import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../generated/client/client';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  tenantId?: string;
}

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

    // Priorizar membresías aprobadas
    const approvedMembership = user.memberships.find((m) => m.aprobado);
    const pendingMembership = user.memberships.find((m) => !m.aprobado);
    const activeMembership = approvedMembership || pendingMembership;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: approvedMembership?.role || Role.OPERADOR,
      tenantId: approvedMembership?.tenantId,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        role: approvedMembership?.role,
        tenantId: approvedMembership?.tenantId,
        hasPendingRequest: !!pendingMembership && !approvedMembership,
      },
    };
  }

  async getProfile(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const allowedUuids = (process.env.ALLOWED_TENANT_ADMINS || '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      const isTenantAdmin = allowedUuids.includes(payload.sub);

      return {
        ...payload,
        isTenantAdmin,
      };
    } catch {
      throw new UnauthorizedException();
    }
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
