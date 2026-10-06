import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { Institution } from '../institutions/entities/institution.entity';
import { Student } from '../students/entities/student.entity';
import {
  EMAIL_SERVICE,
  type EmailProvider,
} from '../email/interfaces/email-provider.interface';
import {
  ADMIN_CREATABLE_ROLES,
  CreateStaffUserDto,
} from './dto/create-staff-user.dto';

const SETUP_TOKEN_TTL_DAYS = 7;

const STAFF_ROLE_LABELS: Record<string, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.OPERATOR]: 'Operator',
  [UserRole.EFU]: 'EFU',
};

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  emailVerified?: boolean;
  isActive?: boolean;
}

export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string | null;
}

const SAFE_USER_FIELDS = [
  'user.id',
  'user.email',
  'user.name',
  'user.phone',
  'user.role',
  'user.emailVerified',
  'user.isActive',
  'user.profilePhotoUrl',
  'user.createdAt',
  'user.updatedAt',
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    private readonly config: ConfigService,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailProvider,
  ) {}

  /** Build the password-setup link the user receives by email. */
  private buildSetupLink(token: string): string {
    const base = (
      this.config.get<string>('FRONTEND_URL') || ''
    ).replace(/\/+$/, '');
    return `${base}/account-setup?token=${token}`;
  }

  /** Issue a fresh one-time setup token (7-day TTL) and persist it. */
  private async issueSetupToken(user: User): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + SETUP_TOKEN_TTL_DAYS);
    user.setupToken = token;
    user.setupTokenExpiresAt = expires;
    await this.usersRepository.save(user);
    return token;
  }

  /**
   * Admin-provisioned standalone staff account (admin/operator/efu). Creates
   * the user with a random password, then emails a link so they set their own.
   */
  async createStaffUser(
    dto: CreateStaffUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    if (!ADMIN_CREATABLE_ROLES.includes(dto.role as never)) {
      throw new BadRequestException(
        'Only admin, operator, or EFU accounts can be created here',
      );
    }

    const email = dto.email.toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const randomPassword = randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(
      randomPassword,
      this.config.get<number>('BCRYPT_SALT_ROUNDS')!,
    );
    const user = await this.usersRepository.save(
      this.usersRepository.create({
        email,
        passwordHash,
        name: dto.name,
        role: dto.role,
        phone: dto.phone ?? null,
        emailVerified: true,
        isActive: true,
      }),
    );

    const token = await this.issueSetupToken(user);
    await this.emailService.sendAccountSetupEmail(
      email,
      dto.name,
      STAFF_ROLE_LABELS[dto.role] ?? 'staff',
      this.buildSetupLink(token),
      false,
    );

    return this.toSafeUser(user);
  }

  /** Re-send (or send a reset of) the password-setup link for a staff user. */
  async resendSetup(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const token = await this.issueSetupToken(user);
    // If they already set a password this is effectively a reset.
    const isReset = user.emailVerified && !!user.passwordHash;
    await this.emailService.sendAccountSetupEmail(
      user.email,
      user.name,
      STAFF_ROLE_LABELS[user.role] ?? 'staff',
      this.buildSetupLink(token),
      isReset,
    );
    return { message: 'Setup link sent' };
  }

  /** Consume a setup token and set the account's password. */
  async setPasswordWithToken(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { setupToken: token } });
    if (!user) {
      throw new BadRequestException('Invalid or already-used setup link');
    }
    if (!user.setupTokenExpiresAt || user.setupTokenExpiresAt < new Date()) {
      throw new BadRequestException('This setup link has expired');
    }
    user.passwordHash = await bcrypt.hash(
      password,
      this.config.get<number>('BCRYPT_SALT_ROUNDS')!,
    );
    user.setupToken = null;
    user.setupTokenExpiresAt = null;
    user.emailVerified = true;
    user.isActive = true;
    await this.usersRepository.save(user);
    return { message: 'Password set successfully. You can now sign in.' };
  }

  private toSafeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  create(input: CreateUserInput): User {
    return this.usersRepository.create({
      ...input,
      email: input.email.toLowerCase(),
    });
  }

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { emailVerified: true });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(userId, { passwordHash });
  }

  createWithManager(
    manager: EntityManager,
    input: CreateUserInput,
  ): Promise<User> {
    const repo = manager.getRepository(User);
    const user = repo.create({ ...input, email: input.email.toLowerCase() });
    return repo.save(user);
  }

  async findAllFiltered(filters: UserFilters = {}): Promise<User[]> {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .select(SAFE_USER_FIELDS);

    if (filters.role) {
      qb.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters.search) {
      qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('user.createdAt', 'DESC');
    return qb.getMany();
  }

  async setActive(id: string, isActive: boolean): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isActive = isActive;
    return this.toSafeUser(await this.usersRepository.save(user));
  }

  async update(
    id: string,
    input: UpdateUserInput,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (input.email && input.email.toLowerCase() !== user.email) {
      const existing = await this.findByEmail(input.email);
      if (existing) {
        throw new ConflictException('A user with this email already exists');
      }
      user.email = input.email.toLowerCase();
    }

    if (input.name !== undefined) {
      user.name = input.name;
    }
    if (input.phone !== undefined) {
      user.phone = input.phone;
    }

    return this.toSafeUser(await this.usersRepository.save(user));
  }

  async updateProfilePhoto(
    id: string,
    photo: { url: string; publicId: string },
  ): Promise<{ previousPublicId: string | null; profilePhotoUrl: string }> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const previousPublicId = user.profilePhotoPublicId;
    user.profilePhotoUrl = photo.url;
    user.profilePhotoPublicId = photo.publicId;
    await this.usersRepository.save(user);
    return { previousPublicId, profilePhotoUrl: photo.url };
  }

  async updateRole(
    id: string,
    role: UserRole,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.role = role;
    return this.toSafeUser(await this.usersRepository.save(user));
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [ownedInstitutions, registeredStudents] = await Promise.all([
      this.institutionsRepository.count({ where: { ownerUserId: id } }),
      this.studentsRepository.count({ where: { registeredByUserId: id } }),
    ]);

    if (ownedInstitutions > 0) {
      throw new ConflictException(
        'This user owns an institution and cannot be deleted. Deactivate the account instead.',
      );
    }
    if (registeredStudents > 0) {
      throw new ConflictException(
        'This user has registered student records and cannot be deleted. Deactivate the account instead.',
      );
    }

    await this.usersRepository.delete(id);
    return { message: 'User deleted' };
  }
}
