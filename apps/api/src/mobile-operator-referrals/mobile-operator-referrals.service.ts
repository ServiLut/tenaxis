import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { Role } from '../generated/client/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicReferralDto } from './dto/create-public-referral.dto';
import { CreatePublicReferralResponseDto } from './dto/create-public-referral-response.dto';
import { MobileOperatorReferralMeResponseDto } from './dto/get-mobile-operator-referral-me-response.dto';
import { PublicReferralCodeResponseDto } from './dto/get-public-referral-code-response.dto';
import { OperatorReferralScope } from './types/operator-referral-scope.type';

const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_MAX_RETRIES = 20;

@Injectable()
export class MobileOperatorReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getMe(
    scope: OperatorReferralScope,
  ): Promise<MobileOperatorReferralMeResponseDto> {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: {
        id: scope.membershipId,
        tenantId: scope.tenantId,
        activo: true,
      },
      select: {
        codigoReferido: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('No se encontró la membresía del operador');
    }

    const code =
      membership.codigoReferido?.trim() ||
      (await this.assignReferralCode(scope));
    const shareUrl = this.buildShareUrl(code);

    return {
      code,
      shareUrl,
      qrValue: shareUrl,
    };
  }

  async resolvePublicCode(
    rawCode: string,
  ): Promise<PublicReferralCodeResponseDto> {
    const { code, membership, empresaId } =
      await this.resolveReferralMembership(rawCode);

    if (!membership || !empresaId) {
      return this.buildInvalidReferralCodeResponse(code);
    }

    return {
      valid: true,
      code,
      empresaId,
      referrer: {
        membershipId: membership.id,
        nombre: membership.user.nombre ?? null,
        apellido: membership.user.apellido ?? null,
      },
    };
  }

  async createPublicReferral(
    dto: CreatePublicReferralDto,
  ): Promise<CreatePublicReferralResponseDto> {
    const { code, membership, empresaId } =
      await this.resolveReferralMembership(dto.code);

    if (!code || !membership || !empresaId) {
      throw new BadRequestException('El código de referido no es válido');
    }

    await this.prisma.referidos.create({
      data: {
        tenantId: membership.tenantId,
        empresaId,
        membershipId: membership.id,
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        telefono: dto.telefono.trim(),
        codigo: code,
      },
    });

    return {
      success: true,
      message: 'Referido registrado correctamente',
    };
  }

  private async assignReferralCode(
    scope: OperatorReferralScope,
  ): Promise<string> {
    const code = await this.generateUniqueReferralCode();

    const result = await this.prisma.tenantMembership.updateMany({
      where: {
        id: scope.membershipId,
        tenantId: scope.tenantId,
      },
      data: {
        codigoReferido: code,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('No se encontró la membresía del operador');
    }

    return code;
  }

  private buildInvalidReferralCodeResponse(
    code: string,
  ): PublicReferralCodeResponseDto {
    return {
      valid: false,
      code,
      empresaId: null,
      referrer: null,
    };
  }

  private async resolveReferralMembership(rawCode: string) {
    const code = this.normalizeReferralCode(rawCode);

    if (!code) {
      return {
        code: '',
        membership: null,
        empresaId: null,
      };
    }

    const membership = await this.prisma.tenantMembership.findFirst({
      where: {
        codigoReferido: code,
        activo: true,
        aprobado: true,
        role: Role.OPERADOR,
      },
      select: {
        id: true,
        tenantId: true,
        empresaMemberships: {
          where: {
            activo: true,
            deletedAt: null,
          },
          select: {
            empresaId: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
        user: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
      },
    });

    return {
      code,
      membership,
      empresaId: membership?.empresaMemberships[0]?.empresaId ?? null,
    };
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < REFERRAL_CODE_MAX_RETRIES; attempt += 1) {
      const candidate = this.buildReferralCodeCandidate();
      const existing = await this.prisma.tenantMembership.findFirst({
        where: {
          codigoReferido: candidate,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException(
      'No fue posible generar un código de referido único',
    );
  }

  private buildReferralCodeCandidate(): string {
    return Array.from({ length: REFERRAL_CODE_LENGTH }, () => {
      const index = randomInt(0, REFERRAL_CODE_ALPHABET.length);
      return REFERRAL_CODE_ALPHABET[index];
    }).join('');
  }

  private normalizeReferralCode(code: string | null | undefined): string {
    return code?.trim().toUpperCase() || '';
  }

  private buildShareUrl(code: string): string {
    const baseUrl = this.resolveShareBaseUrl();
    return `${baseUrl}/registro-referidos?code=${encodeURIComponent(code)}`;
  }

  private resolveShareBaseUrl(): string {
    const candidates = [
      'PUBLIC_APP_URL',
      'APP_URL',
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_WEB_URL',
      'WEB_URL',
      'CLIENT_URL',
    ];

    for (const key of candidates) {
      const value = this.configService.get<string>(key)?.trim();
      if (value) {
        return value.replace(/\/+$/, '');
      }
    }

    return 'http://localhost:3000';
  }
}
