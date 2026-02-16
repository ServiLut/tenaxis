import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '../auth.service';

interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    
    // 1. Intentar obtener de la cabecera Authorization
    let token = request.headers.authorization?.split(' ')[1];

    // 2. Si no hay cabecera, intentar obtener de las cookies
    if (!token && request.headers.cookie) {
      const cookies = request.headers.cookie.split('; ');
      const authCookie = cookies.find(c => c.startsWith('access_token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }

    if (!token) {
      throw new UnauthorizedException('No se encontró un token de autenticación');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
