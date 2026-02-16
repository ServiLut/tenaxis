import {
  Body,
  Controller,
  Post,
  Get,
  Request as NestRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('profile')
  async getProfile(@NestRequest() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException();
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException();
    }
    return this.authService.getProfile(token);
  }
}
