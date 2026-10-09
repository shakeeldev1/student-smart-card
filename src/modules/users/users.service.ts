import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { Individual } from '../individuals/entities/individual.entity';
import { Employee } from '../corporate/entities/employee.entity';
import { Company } from '../corporate/entities/company.entity';
import { AreaManager } from '../area/entities/area-manager.entity';
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
    @InjectRepository(Individual)
    private readonly individualsRepository: Repository<Individual>,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    @InjectRepository(AreaManager)
    private readonly areaManagersRepository: Repository<AreaManager>,
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

  /** Super-admin accounts are not manageable through the admin dashboard. */
  private assertManageable(user: User): void {
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'This account is managed outside the dashboard.',
      );
    }
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

    // Super-admin accounts are hidden from the admin dashboard entirely — they
    // are managed outside it.
    qb.andWhere('user.role != :superRole', {
      superRole: UserRole.SUPER_ADMIN,
    });

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
    this.assertManageable(user);
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
    this.assertManageable(user);

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

  /**
   * The role(s) an account actually has a backing record for. An account can
   * legitimately hold one of these (student/individual/school/corporate/
   * employee/area_manager) only if the matching row exists — flipping the role
   * flag alone does NOT move the account between tables, which is how an
   * "individual" wrongly became a "student" and disappeared from Students.
   */
  private async linkedRolesForUser(userId: string): Promise<UserRole[]> {
    const [student, individual, employee, institution, company, areaManager] =
      await Promise.all([
        this.studentsRepository.count({ where: { userId } }),
        this.individualsRepository.count({ where: { userId } }),
        this.employeesRepository.count({ where: { userId } }),
        this.institutionsRepository.count({ where: { ownerUserId: userId } }),
        this.companiesRepository.count({ where: { ownerUserId: userId } }),
        this.areaManagersRepository.count({ where: { userId } }),
      ]);
    const roles: UserRole[] = [];
    if (student > 0) roles.push(UserRole.STUDENT);
    if (individual > 0) roles.push(UserRole.INDIVIDUAL);
    if (employee > 0) roles.push(UserRole.EMPLOYEE);
    if (institution > 0) roles.push(UserRole.SCHOOL);
    if (company > 0) roles.push(UserRole.CORPORATE);
    if (areaManager > 0) roles.push(UserRole.AREA_MANAGER);
    return roles;
  }

  async updateRole(
    id: string,
    role: UserRole,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (role === user.role) {
      return this.toSafeUser(user);
    }

    // The super-admin role is managed outside the dashboard (set directly in
    // the database). It can never be assigned, nor changed away from, via the
    // admin UI — so a regular admin can neither create nor demote a superuser.
    if (role === UserRole.SUPER_ADMIN || user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'The super-admin role is managed outside the dashboard and cannot be changed here.',
      );
    }

    const STAFF_ROLES = [UserRole.ADMIN, UserRole.OPERATOR, UserRole.EFU];
    const linked = await this.linkedRolesForUser(id);

    // An entity-backed role may only be set if the account has that record.
    // Staff roles may only be assigned to accounts with no entity record
    // (otherwise the linked student/individual/… would be orphaned).
    const allowed = new Set<UserRole>(linked);
    if (linked.length === 0) STAFF_ROLES.forEach((r) => allowed.add(r));

    if (!allowed.has(role)) {
      const hint = linked.length
        ? `This account is linked to a ${linked.join('/')} record, so its role can only be "${linked.join('" or "')}".`
        : 'This account has no linked record, so it can only be an admin, operator, or EFU user.';
      throw new BadRequestException(
        `Can't change the role to "${role}". ${hint}`,
      );
    }

    user.role = role;
    return this.toSafeUser(await this.usersRepository.save(user));
  }

  /**
   * Full account detail plus any linked domain record(s), for the admin
   * "view user" screen. Also reports whether the account's role matches its
   * linked record so the UI can offer a one-click correction.
   */
  async getUserDetail(id: string): Promise<{
    user: Omit<User, 'passwordHash'>;
    linked: Array<{
      role: UserRole;
      type: string;
      title: string;
      href: string | null;
      rows: Array<{ label: string; value: string }>;
    }>;
    roleMatches: boolean;
    suggestedRole: UserRole | null;
  }> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    this.assertManageable(user);

    const S = (v: unknown) => (v === null || v === undefined ? '' : String(v));
    const linked: Array<{
      role: UserRole;
      type: string;
      title: string;
      href: string | null;
      rows: Array<{ label: string; value: string }>;
    }> = [];

    const [student, individual, employee, institution, company, areaManager] =
      await Promise.all([
        this.studentsRepository.findOne({ where: { userId: id } }),
        this.individualsRepository.findOne({ where: { userId: id } }),
        this.employeesRepository.findOne({ where: { userId: id } }),
        this.institutionsRepository.findOne({ where: { ownerUserId: id } }),
        this.companiesRepository.findOne({ where: { ownerUserId: id } }),
        this.areaManagersRepository.findOne({ where: { userId: id } }),
      ]);

    if (student) {
      linked.push({
        role: UserRole.STUDENT,
        type: 'student',
        title: 'Student record',
        href: `/admin/students/${student.id}`,
        rows: [
          { label: 'Full name', value: S(student.fullName) },
          { label: 'B-Form', value: S(student.bFormNumber) },
          { label: 'Roll no', value: S(student.rollNumber) },
          { label: 'Class', value: S(student.className) },
          { label: 'Status', value: S(student.status) },
        ].filter((r) => r.value),
      });
    }
    if (individual) {
      linked.push({
        role: UserRole.INDIVIDUAL,
        type: 'individual',
        title: 'Individual record',
        href: null,
        rows: [
          { label: 'Full name', value: S(individual.fullName) },
          { label: 'CNIC', value: S(individual.cnicNumber) },
          { label: 'Contact', value: S(individual.contactNumber) },
          { label: 'City', value: S(individual.city) },
          { label: 'Status', value: S(individual.status) },
        ].filter((r) => r.value),
      });
    }
    if (employee) {
      linked.push({
        role: UserRole.EMPLOYEE,
        type: 'employee',
        title: 'Employee record',
        href: null,
        rows: [
          { label: 'Full name', value: S(employee.fullName) },
          { label: 'CNIC', value: S(employee.cnicNumber) },
          { label: 'Employee ID', value: S(employee.employeeCode) },
          { label: 'Department', value: S(employee.department) },
          { label: 'Status', value: S(employee.status) },
        ].filter((r) => r.value),
      });
    }
    if (institution) {
      linked.push({
        role: UserRole.SCHOOL,
        type: 'school',
        title: 'School / institution',
        href: null,
        rows: [
          { label: 'Name', value: S(institution.name) },
          { label: 'Reg. no', value: S(institution.registrationNumber) },
          { label: 'City', value: S(institution.city) },
          { label: 'Approval', value: S(institution.approvalStatus) },
        ].filter((r) => r.value),
      });
    }
    if (company) {
      linked.push({
        role: UserRole.CORPORATE,
        type: 'company',
        title: 'Company record',
        href: null,
        rows: [
          { label: 'Name', value: S(company.name) },
          { label: 'Reg. no', value: S(company.registrationNumber) },
          { label: 'City', value: S(company.city) },
          { label: 'Approval', value: S(company.approvalStatus) },
        ].filter((r) => r.value),
      });
    }
    if (areaManager) {
      linked.push({
        role: UserRole.AREA_MANAGER,
        type: 'area_manager',
        title: 'Area manager scope',
        href: null,
        rows: [
          { label: 'Level', value: S(areaManager.level) },
          { label: 'Province', value: S(areaManager.province) },
          { label: 'District', value: S(areaManager.district) },
        ].filter((r) => r.value),
      });
    }

    const linkedRoles = linked.map((l) => l.role);
    const roleMatches =
      linkedRoles.length === 0
        ? [
            UserRole.ADMIN,
            UserRole.OPERATOR,
            UserRole.EFU,
            UserRole.SUPER_ADMIN,
          ].includes(user.role)
        : linkedRoles.includes(user.role);
    const suggestedRole =
      !roleMatches && linkedRoles.length === 1 ? linkedRoles[0] : null;

    return {
      user: this.toSafeUser(user),
      linked,
      roleMatches,
      suggestedRole,
    };
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    this.assertManageable(user);

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
