import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './auth.service';
import { LdapAuthService } from './ldap-auth.service';
import { AuthController } from './auth.controller';
import { LoggerModule } from '../logger/logger.module';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_ACCESS_SECRET');
        if (!secret || secret.trim() === '') {
          throw new Error('JWT_ACCESS_SECRET debe estar definido en las variables de entorno');
        }
        return { secret };
      },
    }),
    LoggerModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LdapAuthService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    LdapAuthService,
    AuthGuard,
    RolesGuard,
    JwtModule,
  ],
})
export class AuthModule {}
