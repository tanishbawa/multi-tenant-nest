import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { AuthLoginDto } from './dto/auth.login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { AuthRefreshDto } from './dto/auth.refresh.dto';
import type { StringValue } from 'ms';

type TokenPayload = {
  sub: string;
  email: string;
  typ: 'access' | 'refresh';
  jti: string;
};

const isTokenPayload = (value: unknown): value is TokenPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<TokenPayload>;
  return (
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.jti === 'string' &&
    (payload.typ === 'access' || payload.typ === 'refresh')
  );
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(authLoginDto: AuthLoginDto): Promise<{
    message: string;
    user_id: string;
    access_token: string;
    refresh_token: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { email: authLoginDto.email },
      select: ['id', 'email', 'password_hash', 'is_active'],
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.is_active === false) {
      throw new UnauthorizedException('User is not active');
    }
    if (!user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(
      authLoginDto.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jwtPayload = {
      sub: user.id,
      email: user.email,
      typ: 'access' as const,
      jti: randomUUID(),
    };

    const accessToken = await this.signAccessToken(jwtPayload);
    const refreshToken = await this.signRefreshToken({
      ...jwtPayload,
      typ: 'refresh',
      jti: randomUUID(),
    });
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.refresh_token_hash = refreshTokenHash;
    await this.userRepository.save(user);

    return {
      message: 'Login successful',
      user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refreshTokens(authRefreshDto: AuthRefreshDto): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      this.configService.get<string>('JWT_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET or JWT_SECRET is not configured');
    }

    let payload: TokenPayload;
    try {
      const decoded = (await this.jwtService.verifyAsync(
        authRefreshDto.refresh_token,
        { secret: refreshSecret },
      )) as unknown;
      if (!isTokenPayload(decoded)) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      payload = decoded;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'is_active', 'refresh_token_hash'],
    });
    if (!user || !user.is_active || !user.refresh_token_hash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      authRefreshDto.refresh_token,
      String(user.refresh_token_hash),
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newAccessToken = await this.signAccessToken({
      sub: user.id,
      email: user.email,
      typ: 'access',
      jti: randomUUID(),
    });
    const newRefreshToken = await this.signRefreshToken({
      sub: user.id,
      email: user.email,
      typ: 'refresh',
      jti: randomUUID(),
    });
    user.refresh_token_hash = await bcrypt.hash(newRefreshToken, 10);
    await this.userRepository.save(user);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'is_active', 'refresh_token_hash'],
    });

    if (user?.is_active !== true) {
      throw new UnauthorizedException('User is not active');
    }

    user.refresh_token_hash = null;
    await this.userRepository.save(user);

    return { message: 'Logged out successfully' };
  }

  private async signAccessToken(payload: TokenPayload): Promise<string> {
    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      this.configService.get<string>('JWT_SECRET');
    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET or JWT_SECRET is not configured');
    }

    return await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: this.getJwtExpiry('JWT_ACCESS_EXPIRES_IN', '15m'),
      issuer: 'multi-tenant-nest',
      audience: 'multi-tenant-nest-api',
    });
  }

  private async signRefreshToken(payload: TokenPayload): Promise<string> {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      this.configService.get<string>('JWT_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET or JWT_SECRET is not configured');
    }

    return await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: this.getJwtExpiry('JWT_REFRESH_EXPIRES_IN', '7d'),
      issuer: 'multi-tenant-nest',
      audience: 'multi-tenant-nest-api',
    });
  }

  private getJwtExpiry(
    configKey: 'JWT_ACCESS_EXPIRES_IN' | 'JWT_REFRESH_EXPIRES_IN',
    fallback: StringValue,
  ): StringValue {
    const configuredValue = this.configService.get<string>(configKey);
    return (configuredValue ?? fallback) as StringValue;
  }
}
