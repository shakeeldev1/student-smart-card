import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/enums/user-role.enum';
import { InstitutionsService } from '../institutions/institutions.service';
import { OtpService } from './otp.service';
import { TokenService, RequestMeta } from './token.service';
import { OtpPurpose } from './enums/otp-purpose.enum';
import {
  EMAIL_SERVICE,
  type EmailProvider,
} from '../email/interfaces/email-provider.interface';
import { RegisterParentDto } from './dto/register-parent.dto';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetupStudentAccountDto } from './dto/setup-student-account.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { Student } from '../students/entities/student.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import type { Multer } from 'multer';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly institutionsService: InstitutionsService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailProvider,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private hashPassword(password: string): Promise<string> {
    return bcrypt.hash(
      password,
      this.config.get<number>('BCRYPT_SALT_ROUNDS')!,
    );
  }

  async registerParent(dto: RegisterParentDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: UserRole.PARENT,
      phone: dto.phone ?? null,
    });
    const saved = await this.usersService.save(user);

    const code = await this.otpService.generate(
      saved.id,
      OtpPurpose.EMAIL_VERIFICATION,
    );
    await this.emailService.sendOtpEmail(
      saved.email,
      code,
      OtpPurpose.EMAIL_VERIFICATION,
    );

    return {
      userId: saved.id,
      email: saved.email,
      message: 'Verification code sent',
    };
  }

  async registerIndividual(dto: RegisterParentDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: UserRole.INDIVIDUAL,
      phone: dto.phone ?? null,
    });
    const saved = await this.usersService.save(user);

    const code = await this.otpService.generate(
      saved.id,
      OtpPurpose.EMAIL_VERIFICATION,
    );
    await this.emailService.sendOtpEmail(
      saved.email,
      code,
      OtpPurpose.EMAIL_VERIFICATION,
    );

    return {
      userId: saved.id,
      email: saved.email,
      message: 'Verification code sent',
    };
  }

  async registerSchool(dto: RegisterSchoolDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const existingInstitution =
      await this.institutionsService.findByRegistrationNumber(
        dto.institution.registrationNumber,
      );
    if (existingInstitution) {
      throw new ConflictException(
        'Institution registration number already registered',
      );
    }

    const passwordHash = await this.hashPassword(dto.password);

    const { user, institution } = await this.dataSource.transaction(
      async (manager) => {
        const user = await this.usersService.createWithManager(manager, {
          email: dto.email,
          passwordHash,
          name: dto.name,
          role: UserRole.SCHOOL,
          phone: dto.phone ?? null,
        });

        const institution = await this.institutionsService.createWithManager(
          manager,
          {
            ownerUserId: user.id,
            ...dto.institution,
          },
        );

        return { user, institution };
      },
    );

    const code = await this.otpService.generate(
      user.id,
      OtpPurpose.EMAIL_VERIFICATION,
    );
    await this.emailService.sendOtpEmail(
      user.email,
      code,
      OtpPurpose.EMAIL_VERIFICATION,
    );

    return {
      userId: user.id,
      institutionId: institution.id,
      email: user.email,
      message: 'Verification code sent',
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Invalid or expired code');
    }

    await this.otpService.verify(
      user.id,
      OtpPurpose.EMAIL_VERIFICATION,
      dto.code,
    );
    await this.usersService.markEmailVerified(user.id);

    return { verified: true, message: 'Email verified. You can now log in.' };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (user) {
      const code = await this.otpService.generate(user.id, dto.purpose);
      await this.emailService.sendOtpEmail(user.email, code, dto.purpose);
    }
    return { message: 'If an account exists, a new code has been sent.' };
  }

  async login(dto: LoginDto, meta: RequestMeta = {}) {
    const user = await this.usersService.findByEmail(dto.email);
    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email not verified',
      });
    }

    // Schools can always log in and reach their dashboard, regardless of
    // approval status — the dashboard itself shows pending/rejected status
    // (via GET /institutions/me) rather than blocking access at login.

    const tokens = await this.tokenService.issueTokenPair(user, meta);
    return {
      status: 'OK',
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refresh(dto: RefreshTokenDto, meta: RequestMeta = {}) {
    return this.tokenService.rotateRefreshToken(dto.refreshToken, meta);
  }

  async logout(dto: RefreshTokenDto) {
    await this.tokenService.revokeRefreshToken(dto.refreshToken);
    return { message: 'Logged out' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (user) {
      const code = await this.otpService.generate(
        user.id,
        OtpPurpose.PASSWORD_RESET,
      );
      await this.emailService.sendOtpEmail(
        user.email,
        code,
        OtpPurpose.PASSWORD_RESET,
      );
    }
    return { message: 'If an account exists, a reset code has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Invalid or expired code');
    }

    await this.otpService.verify(user.id, OtpPurpose.PASSWORD_RESET, dto.code);
    const passwordHash = await this.hashPassword(dto.newPassword);
    await this.usersService.updatePassword(user.id, passwordHash);
    await this.tokenService.revokeAllForUser(user.id);

    return { message: 'Password reset successful. Please log in.' };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    const base = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      emailVerified: user.emailVerified,
      profilePhotoUrl: user.profilePhotoUrl,
    };

    if (user.role === UserRole.SCHOOL) {
      const institution = await this.institutionsService.findByOwnerUserId(
        user.id,
      );
      return {
        ...base,
        institution: institution
          ? {
              id: institution.id,
              name: institution.name,
              approvalStatus: institution.approvalStatus,
            }
          : null,
      };
    }

    return base;
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const updated = await this.usersService.update(userId, dto);
    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
    };
  }

  async updateMyProfilePhoto(userId: string, file: Multer.File) {
    const uploaded = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      'student-smart-card/profile-photos',
      file.originalname,
    );

    const { previousPublicId, profilePhotoUrl } =
      await this.usersService.updateProfilePhoto(userId, uploaded);

    if (previousPublicId) {
      await this.cloudinaryService.destroy(previousPublicId);
    }

    return { profilePhotoUrl };
  }

  async setupStudentAccount(dto: SetupStudentAccountDto) {
    const student = await this.studentsRepository.findOne({
      where: { setupToken: dto.token },
    });

    if (!student) {
      throw new BadRequestException('Invalid or expired setup token');
    }

    if (!student.setupTokenExpiresAt || student.setupTokenExpiresAt < new Date()) {
      throw new BadRequestException('Setup token has expired');
    }

    if (student.userId) {
      throw new BadRequestException('Account already set up');
    }

    if (!student.email) {
      throw new BadRequestException(
        'This student record has no email on file. Contact support to add one before setting up an account.',
      );
    }

    const existingUser = await this.usersService.findByEmail(student.email);
    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists. Please log in instead, or contact support if you believe this is an error.',
      );
    }

    // Create user account for student
    const passwordHash = await this.hashPassword(dto.password);
    const userEntity = this.usersService.create({
      email: student.email,
      passwordHash,
      name: student.fullName,
      role: UserRole.STUDENT,
      emailVerified: true,
    });
    const user = await this.usersService.save(userEntity);

    // Link student to user
    student.userId = user.id;
    student.setupToken = null;
    student.setupTokenExpiresAt = null;
    await this.studentsRepository.save(student);

    // Generate tokens
    const tokens = await this.tokenService.issueTokenPair(user);

    return {
      message: 'Account setup successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  listActiveSessions() {
    return this.tokenService.listActiveSessions();
  }

  async revokeSession(id: string): Promise<{ message: string }> {
    await this.tokenService.revokeSession(id);
    return { message: 'Session revoked' };
  }
}
