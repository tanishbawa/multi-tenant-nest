import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth.login.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthRefreshDto } from './dto/auth.refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
  };
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() authLoginDto: AuthLoginDto): Promise<{
    message: string;
    user_id: string;
    access_token: string;
    refresh_token: string;
  }> {
    return await this.authService.login(authLoginDto);
  }

  @Post('refresh')
  async refresh(@Body() authRefreshDto: AuthRefreshDto): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    return await this.authService.refreshTokens(authRefreshDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: AuthenticatedRequest): Promise<{ message: string }> {
    return await this.authService.logout(req.user.userId);
  }
}
