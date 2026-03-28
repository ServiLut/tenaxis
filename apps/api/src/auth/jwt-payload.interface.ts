import { Role } from '../generated/client/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  tenantId?: string;
  empresaId?: string;
  empresaIds?: string[];
  zonaIds?: string[];
  membershipId?: string;
  sesionId?: string;
  isGlobalSuAdmin?: boolean;
}
