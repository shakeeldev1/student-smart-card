import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailOtp } from './entities/email-otp.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Student } from '../students/entities/student.entity';
import { UsersModule } from '../users/users.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailOtp, RefreshToken, Student]),
    UsersModule,
    InstitutionsModule,
    PassportModule,
    JwtModule.register({}),
  ],
  providers: [OtpService, TokenService, JwtStrategy, AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
