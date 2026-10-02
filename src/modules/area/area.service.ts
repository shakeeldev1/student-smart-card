import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Inject } from '@nestjs/common';
import { AreaManager } from './entities/area-manager.entity';
import {
  AreaLevel,
  childLevel,
  requiredAreaColumns,
} from './enums/area-level.enum';
import { CreateAreaManagerDto } from './dto/create-area-manager.dto';
import { UpdateAreaManagerDto } from './dto/update-area-manager.dto';
import { Institution } from '../institutions/entities/institution.entity';
import { InstitutionApprovalStatus } from '../institutions/enums/institution-approval-status.enum';
import { Student } from '../students/entities/student.entity';
import { ApplicationStatus } from '../students/enums/application-status.enum';
import { Gender } from '../students/enums/gender.enum';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/enums/user-role.enum';
import {
  EMAIL_SERVICE,
  type EmailProvider,
} from '../email/interfaces/email-provider.interface';

type GeoColumn = 'province' | 'region' | 'district' | 'tehsil';

export interface AreaScope {
  level: AreaLevel;
  province: string;
  region: string | null;
  district: string | null;
  tehsil: string | null;
}

/** A drill filter chosen inside the manager's own area. */
export interface SubFilter {
  region?: string;
  district?: string;
  tehsil?: string;
}

const SETUP_TOKEN_TTL_DAYS = 7;

@Injectable()
export class AreaService {
  constructor(
    @InjectRepository(AreaManager)
    private readonly managersRepository: Repository<AreaManager>,
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailProvider,
  ) {}

  // ---------------------------------------------------------------------------
  // Scope resolution
  // ---------------------------------------------------------------------------

  /** Loads the calling manager's assigned area, or throws if none exists. */
  async getScopeForUser(userId: string): Promise<AreaScope> {
    const manager = await this.managersRepository.findOne({
      where: { userId },
    });
    if (!manager) {
      throw new ForbiddenException(
        'No area is assigned to this account. Contact an administrator.',
      );
    }
    return {
      level: manager.level,
      province: manager.province,
      region: manager.region,
      district: manager.district,
      tehsil: manager.tehsil,
    };
  }

  /** Human-readable "Tehsil, District, Region, Province" trimmed to level. */
  private scopeLabel(scope: AreaScope): string {
    const parts = [scope.tehsil, scope.district, scope.region, scope.province]
      .filter((v): v is string => Boolean(v));
    return parts.join(', ');
  }

  async getMyArea(userId: string) {
    const scope = await this.getScopeForUser(userId);
    return {
      level: scope.level,
      province: scope.province,
      region: scope.region,
      district: scope.district,
      tehsil: scope.tehsil,
      label: this.scopeLabel(scope),
      childLevel: childLevel(scope.level),
    };
  }

  /** Applies every fixed geo column of the scope as an equality filter. */
  private applyScope<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    scope: AreaScope,
  ): void {
    qb.andWhere(`${alias}.province = :scopeProvince`, {
      scopeProvince: scope.province,
    });
    if (scope.region) {
      qb.andWhere(`${alias}.region = :scopeRegion`, { scopeRegion: scope.region });
    }
    if (scope.district) {
      qb.andWhere(`${alias}.district = :scopeDistrict`, {
        scopeDistrict: scope.district,
      });
    }
    if (scope.tehsil) {
      qb.andWhere(`${alias}.tehsil = :scopeTehsil`, {
        scopeTehsil: scope.tehsil,
      });
    }
  }

  /**
   * Applies a drill-down filter, but only for tiers strictly below the
   * manager's own level (a manager can never widen past their scope).
   */
  private applySubFilter<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    scope: AreaScope,
    filter: SubFilter,
  ): void {
    if (!scope.region && filter.region) {
      qb.andWhere(`${alias}.region = :fRegion`, { fRegion: filter.region });
    }
    if (!scope.district && filter.district) {
      qb.andWhere(`${alias}.district = :fDistrict`, {
        fDistrict: filter.district,
      });
    }
    if (!scope.tehsil && filter.tehsil) {
      qb.andWhere(`${alias}.tehsil = :fTehsil`, { fTehsil: filter.tehsil });
    }
  }

  // ---------------------------------------------------------------------------
  // Manager-facing analytics (aggregate only — never student PII)
  // ---------------------------------------------------------------------------

  async getAnalytics(userId: string) {
    const scope = await this.getScopeForUser(userId);
    const child = childLevel(scope.level);

    const schoolsQb = this.institutionsRepository
      .createQueryBuilder('institution')
      .where('institution.approvalStatus = :approved', {
        approved: InstitutionApprovalStatus.APPROVED,
      });
    this.applyScope(schoolsQb, 'institution', scope);

    const studentsCountQb = this.studentsRepository.createQueryBuilder('student');
    this.applyScope(studentsCountQb, 'student', scope);

    const genderQb = this.studentsRepository
      .createQueryBuilder('student')
      .select('student.gender', 'gender')
      .addSelect('COUNT(*)', 'count')
      .groupBy('student.gender');
    this.applyScope(genderQb, 'student', scope);

    const statusQb = this.studentsRepository
      .createQueryBuilder('student')
      .select('student.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('student.status');
    this.applyScope(statusQb, 'student', scope);

    const cardQb = this.studentsRepository
      .createQueryBuilder('student')
      .leftJoin('student.card', 'card')
      .select(`COALESCE("card"."status"::text, 'no_card')`, 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`COALESCE("card"."status"::text, 'no_card')`);
    this.applyScope(cardQb, 'student', scope);

    const topSchoolsQb = this.studentsRepository
      .createQueryBuilder('student')
      .innerJoin('student.institution', 'institution')
      .select('institution.id', 'id')
      .addSelect('institution.name', 'name')
      .addSelect('institution.principalName', 'principalName')
      .addSelect('COUNT(*)', 'count')
      .groupBy('institution.id')
      .addGroupBy('institution.name')
      .addGroupBy('institution.principalName')
      .orderBy('count', 'DESC')
      .limit(8);
    this.applyScope(topSchoolsQb, 'student', scope);

    const trendQb = this.studentsRepository
      .createQueryBuilder('student')
      .select(`to_char("student"."createdAt", 'YYYY-MM')`, 'month')
      .addSelect('COUNT(*)', 'count')
      .where(
        `"student"."createdAt" >= (date_trunc('month', now()) - interval '5 months')`,
      )
      .groupBy('month')
      .orderBy('month', 'ASC');
    this.applyScope(trendQb, 'student', scope);

    const [
      schools,
      students,
      certificatesIssued,
      genderRows,
      statusRows,
      cardRows,
      topSchoolRows,
      trendRows,
      subAreas,
    ] = await Promise.all([
      schoolsQb.getCount(),
      studentsCountQb.getCount(),
      (() => {
        const qb = this.studentsRepository
          .createQueryBuilder('student')
          .where('student.certificateIssued = true');
        this.applyScope(qb, 'student', scope);
        return qb.getCount();
      })(),
      genderQb.getRawMany<{ gender: string; count: string }>(),
      statusQb.getRawMany<{ status: string; count: string }>(),
      cardQb.getRawMany<{ status: string; count: string }>(),
      topSchoolsQb.getRawMany<{
        id: string;
        name: string;
        principalName: string;
        count: string;
      }>(),
      trendQb.getRawMany<{ month: string; count: string }>(),
      this.getSubAreaDistribution(scope),
    ]);

    const asCount = (
      rows: Array<Record<string, string>>,
      key: string,
      value: string,
    ) => Number(rows.find((row) => row[key] === value)?.count ?? 0);

    const genderBreakdown = {
      male: asCount(genderRows, 'gender', Gender.MALE),
      female: asCount(genderRows, 'gender', Gender.FEMALE),
    };

    const statusBreakdown = {
      pending: asCount(statusRows, 'status', ApplicationStatus.PENDING),
      approved: asCount(statusRows, 'status', ApplicationStatus.APPROVED),
      changes_requested: asCount(
        statusRows,
        'status',
        ApplicationStatus.CHANGES_REQUESTED,
      ),
      rejected: asCount(statusRows, 'status', ApplicationStatus.REJECTED),
    };

    const cardBreakdown = {
      active: asCount(cardRows, 'status', 'active'),
      pending_verification: asCount(cardRows, 'status', 'pending_verification'),
      suspended: asCount(cardRows, 'status', 'suspended'),
      expired: asCount(cardRows, 'status', 'expired'),
      no_card: asCount(cardRows, 'status', 'no_card'),
    };

    const notIssued = students - certificatesIssued;
    const certificate = {
      issued: certificatesIssued,
      notIssued: notIssued < 0 ? 0 : notIssued,
      rate: students ? Math.round((certificatesIssued / students) * 100) : 0,
    };

    // Continuous 6-month series.
    const trendMap = new Map(trendRows.map((row) => [row.month, Number(row.count)]));
    const monthlyTrend: Array<{ month: string; count: number }> = [];
    const cursor = new Date();
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() - 5);
    for (let i = 0; i < 6; i += 1) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend.push({ month: key, count: trendMap.get(key) ?? 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return {
      area: {
        level: scope.level,
        label: this.scopeLabel(scope),
        childLevel: child,
      },
      totals: { schools, students, certificatesIssued },
      genderBreakdown,
      statusBreakdown,
      cardBreakdown,
      certificate,
      topSchools: topSchoolRows.map((row) => ({
        id: row.id,
        name: row.name,
        principalName: row.principalName,
        count: Number(row.count),
      })),
      monthlyTrend,
      subAreas,
    };
  }

  /**
   * Student counts grouped by the tier immediately below the manager's level
   * (regions for a province manager, districts for a region manager, …). Empty
   * when the manager is already at tehsil level.
   */
  private async getSubAreaDistribution(scope: AreaScope) {
    const child = childLevel(scope.level);
    if (!child) return [];
    const column = child as GeoColumn;

    const qb = this.studentsRepository
      .createQueryBuilder('student')
      .select(`student.${column}`, 'name')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        `SUM(CASE WHEN "student"."gender"::text = :genderMale THEN 1 ELSE 0 END)`,
        'male',
      )
      .addSelect(
        `SUM(CASE WHEN "student"."gender"::text = :genderFemale THEN 1 ELSE 0 END)`,
        'female',
      )
      .andWhere(`student.${column} IS NOT NULL`)
      .groupBy(`student.${column}`)
      .orderBy('count', 'DESC')
      .limit(12)
      .setParameter('genderMale', Gender.MALE)
      .setParameter('genderFemale', Gender.FEMALE);
    this.applyScope(qb, 'student', scope);

    const rows = await qb.getRawMany<{
      name: string;
      count: string;
      male: string;
      female: string;
    }>();
    return rows.map((row) => ({
      name: row.name,
      count: Number(row.count),
      male: Number(row.male),
      female: Number(row.female),
    }));
  }

  // ---------------------------------------------------------------------------
  // Drill-down: sub-areas -> schools -> one school's aggregate
  // ---------------------------------------------------------------------------

  /**
   * Lists the tier below the manager (optionally below a chosen sub-area),
   * each row carrying its school and student counts. When there is no lower
   * tier, `childLevel` is null and the caller should list schools instead.
   */
  async listSubAreas(userId: string, filter: SubFilter = {}) {
    const scope = await this.getScopeForUser(userId);
    // Effective level after applying any chosen drill filters.
    let effective = scope.level;
    const effScope: AreaScope = { ...scope };
    if (!scope.region && filter.region) {
      effScope.region = filter.region;
      effective = AreaLevel.REGION;
    }
    if (!scope.district && filter.district) {
      effScope.district = filter.district;
      effective = AreaLevel.DISTRICT;
    }
    if (!scope.tehsil && filter.tehsil) {
      effScope.tehsil = filter.tehsil;
      effective = AreaLevel.TEHSIL;
    }

    const child = childLevel(effective);
    if (!child) {
      return { childLevel: null, rows: [] };
    }
    const column = child as GeoColumn;

    const schoolQb = this.institutionsRepository
      .createQueryBuilder('institution')
      .select(`institution.${column}`, 'name')
      .addSelect('COUNT(*)', 'schoolCount')
      .andWhere(`institution.${column} IS NOT NULL`)
      .andWhere('institution.approvalStatus = :approved', {
        approved: InstitutionApprovalStatus.APPROVED,
      })
      .groupBy(`institution.${column}`);
    this.applyScope(schoolQb, 'institution', effScope);

    const studentQb = this.studentsRepository
      .createQueryBuilder('student')
      .select(`student.${column}`, 'name')
      .addSelect('COUNT(*)', 'studentCount')
      .andWhere(`student.${column} IS NOT NULL`)
      .groupBy(`student.${column}`);
    this.applyScope(studentQb, 'student', effScope);

    const [schoolGroups, studentGroups] = await Promise.all([
      schoolQb.getRawMany<{ name: string; schoolCount: string }>(),
      studentQb.getRawMany<{ name: string; studentCount: string }>(),
    ]);

    const studentMap = new Map(
      studentGroups.map((r) => [r.name, Number(r.studentCount)]),
    );
    const rows = schoolGroups
      .map((r) => ({
        name: r.name,
        schoolCount: Number(r.schoolCount),
        studentCount: studentMap.get(r.name) ?? 0,
      }))
      .sort((a, b) => b.studentCount - a.studentCount);

    return { childLevel: child, rows };
  }

  /**
   * Schools within the manager's scope (optionally narrowed by a chosen
   * sub-area). Each row: name, head/principal, city, approval status and the
   * total enrolled children — no student-level data.
   */
  async listSchools(userId: string, filter: SubFilter = {}, search?: string) {
    const scope = await this.getScopeForUser(userId);

    const qb = this.institutionsRepository
      .createQueryBuilder('institution')
      .where('institution.approvalStatus = :approved', {
        approved: InstitutionApprovalStatus.APPROVED,
      });
    this.applyScope(qb, 'institution', scope);
    this.applySubFilter(qb, 'institution', scope, filter);
    if (search) {
      qb.andWhere(
        '(institution.name ILIKE :search OR institution.principalName ILIKE :search OR institution.city ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    qb.orderBy('institution.name', 'ASC');

    const institutions = await qb.getMany();
    if (institutions.length === 0) return [];

    const counts = await this.studentsRepository
      .createQueryBuilder('student')
      .select('student.institutionId', 'institutionId')
      .addSelect('COUNT(*)', 'count')
      .where('student.institutionId IN (:...ids)', {
        ids: institutions.map((i) => i.id),
      })
      .groupBy('student.institutionId')
      .getRawMany<{ institutionId: string; count: string }>();
    const countMap = new Map(
      counts.map((r) => [r.institutionId, Number(r.count)]),
    );

    return institutions.map((inst) => ({
      id: inst.id,
      name: inst.name,
      principalName: inst.principalName,
      city: inst.city,
      province: inst.province,
      region: inst.region,
      district: inst.district,
      tehsil: inst.tehsil,
      approvalStatus: inst.approvalStatus,
      totalStudents: countMap.get(inst.id) ?? 0,
    }));
  }

  /**
   * One school's aggregate profile. Verifies the institution falls inside the
   * manager's scope before returning anything. Returns counts and breakdowns
   * only — never individual student records.
   */
  async getSchoolAggregate(userId: string, institutionId: string) {
    const scope = await this.getScopeForUser(userId);
    const institution = await this.institutionsRepository.findOne({
      where: { id: institutionId },
    });
    if (!institution) {
      throw new NotFoundException('School not found');
    }
    // Enforce scope: every fixed column must match.
    const withinScope = requiredAreaColumns(scope.level).every(
      (col) => (institution[col] ?? null) === (scope[col] ?? null),
    );
    if (!withinScope) {
      throw new ForbiddenException('This school is outside your area');
    }

    const base = () =>
      this.studentsRepository
        .createQueryBuilder('student')
        .where('student.institutionId = :institutionId', { institutionId });

    const [total, genderRows, statusRows, cardRows, classRows] =
      await Promise.all([
        base().getCount(),
        base()
          .select('student.gender', 'gender')
          .addSelect('COUNT(*)', 'count')
          .groupBy('student.gender')
          .getRawMany<{ gender: string; count: string }>(),
        base()
          .select('student.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('student.status')
          .getRawMany<{ status: string; count: string }>(),
        base()
          .leftJoin('student.card', 'card')
          .select(`COALESCE("card"."status"::text, 'no_card')`, 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy(`COALESCE("card"."status"::text, 'no_card')`)
          .getRawMany<{ status: string; count: string }>(),
        base()
          .select('student.className', 'className')
          .addSelect('COUNT(*)', 'count')
          .groupBy('student.className')
          .orderBy('COUNT(*)', 'DESC')
          .getRawMany<{ className: string; count: string }>(),
      ]);

    const asCount = (
      rows: Array<Record<string, string>>,
      key: string,
      value: string,
    ) => Number(rows.find((row) => row[key] === value)?.count ?? 0);

    return {
      school: {
        id: institution.id,
        name: institution.name,
        principalName: institution.principalName,
        type: institution.type,
        city: institution.city,
        address: institution.address,
        province: institution.province,
        region: institution.region,
        district: institution.district,
        tehsil: institution.tehsil,
        approvalStatus: institution.approvalStatus,
      },
      totalStudents: total,
      genderBreakdown: {
        male: asCount(genderRows, 'gender', Gender.MALE),
        female: asCount(genderRows, 'gender', Gender.FEMALE),
      },
      statusBreakdown: {
        pending: asCount(statusRows, 'status', ApplicationStatus.PENDING),
        approved: asCount(statusRows, 'status', ApplicationStatus.APPROVED),
        changes_requested: asCount(
          statusRows,
          'status',
          ApplicationStatus.CHANGES_REQUESTED,
        ),
        rejected: asCount(statusRows, 'status', ApplicationStatus.REJECTED),
      },
      cardBreakdown: {
        active: asCount(cardRows, 'status', 'active'),
        pending_verification: asCount(cardRows, 'status', 'pending_verification'),
        suspended: asCount(cardRows, 'status', 'suspended'),
        expired: asCount(cardRows, 'status', 'expired'),
        no_card: asCount(cardRows, 'status', 'no_card'),
      },
      classBreakdown: classRows.map((r) => ({
        className: r.className,
        count: Number(r.count),
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Admin provisioning
  // ---------------------------------------------------------------------------

  private validateAreaFields(dto: {
    level: AreaLevel;
    province: string;
    region?: string;
    district?: string;
    tehsil?: string;
  }) {
    for (const col of requiredAreaColumns(dto.level)) {
      if (!dto[col] || !String(dto[col]).trim()) {
        throw new BadRequestException(
          `"${col}" is required for a ${dto.level} manager`,
        );
      }
    }
  }

  private setupLink(token: string): string {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    return `${frontendUrl}/area-manager-setup?token=${token}`;
  }

  private async sendSetupEmail(to: string, name: string, label: string, token: string) {
    const link = this.setupLink(token);
    await this.emailService.sendMail({
      to,
      subject: 'Your Student Smart Card area manager account',
      text: `Hello ${name},\n\nAn administrator has created an area manager account for you covering: ${label}.\n\nTo set your password and sign in, open this link:\n\n${link}\n\nThis link expires in ${SETUP_TOKEN_TTL_DAYS} days.`,
      html: `
        <p>Hello ${name},</p>
        <p>An administrator has created an <strong>area manager</strong> account for you covering: <strong>${label}</strong>.</p>
        <p>To set your password and sign in, click the button below:</p>
        <p style="margin:30px 0;">
          <a href="${link}" style="background-color:#C9A84C;color:#0A1628;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
            Set Your Password
          </a>
        </p>
        <p style="color:#666;font-size:12px;">This link expires in ${SETUP_TOKEN_TTL_DAYS} days. If you did not expect this, please ignore this email.</p>
      `,
    });
  }

  async createAreaManager(dto: CreateAreaManagerDto) {
    this.validateAreaFields(dto);

    const email = dto.email.toLowerCase();
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    // User is created immediately (needed for role-based login) with a random
    // password; the manager sets a real one via the emailed setup link.
    const randomPassword = randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(
      randomPassword,
      this.config.get<number>('BCRYPT_SALT_ROUNDS')!,
    );
    const userEntity = this.usersService.create({
      email,
      passwordHash,
      name: dto.name,
      role: UserRole.AREA_MANAGER,
      phone: dto.phone ?? null,
      emailVerified: true,
      isActive: true,
    });
    const user = await this.usersService.save(userEntity);

    const setupToken = randomBytes(32).toString('hex');
    const setupTokenExpiresAt = new Date();
    setupTokenExpiresAt.setDate(
      setupTokenExpiresAt.getDate() + SETUP_TOKEN_TTL_DAYS,
    );

    const manager = this.managersRepository.create({
      userId: user.id,
      level: dto.level,
      province: dto.province,
      region: dto.region ?? null,
      district: dto.district ?? null,
      tehsil: dto.tehsil ?? null,
      setupToken,
      setupTokenExpiresAt,
    });
    await this.managersRepository.save(manager);

    const label = this.scopeLabel({
      level: manager.level,
      province: manager.province,
      region: manager.region,
      district: manager.district,
      tehsil: manager.tehsil,
    });
    await this.sendSetupEmail(email, dto.name, label, setupToken);

    return this.toDetail(manager, user.email, dto.name, dto.phone ?? null, true, false);
  }

  async listAreaManagers() {
    const managers = await this.managersRepository.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
    return managers.map((m) =>
      this.toDetail(
        m,
        m.user?.email ?? '',
        m.user?.name ?? '',
        m.user?.phone ?? null,
        m.user?.isActive ?? false,
        Boolean(m.setupToken),
      ),
    );
  }

  async updateAreaManager(id: string, dto: UpdateAreaManagerDto) {
    const manager = await this.managersRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!manager) {
      throw new NotFoundException('Area manager not found');
    }
    if (dto.name !== undefined || dto.phone !== undefined) {
      await this.usersService.update(manager.userId, {
        name: dto.name,
        phone: dto.phone,
      });
    }
    if (dto.isActive !== undefined) {
      await this.usersService.setActive(manager.userId, dto.isActive);
    }

    // Optional reassignment of the level + area. Only when a level is given so
    // partial contact-only edits never clear the area.
    if (dto.level !== undefined) {
      const nextLevel = dto.level;
      const nextArea = {
        level: nextLevel,
        province: dto.province ?? manager.province,
        region: dto.region ?? manager.region ?? undefined,
        district: dto.district ?? manager.district ?? undefined,
        tehsil: dto.tehsil ?? manager.tehsil ?? undefined,
      };
      this.validateAreaFields(nextArea);
      // Null out any tier below the new level so a demoted manager isn't left
      // with a stale deeper value.
      const keep = requiredAreaColumns(nextLevel);
      manager.level = nextLevel;
      manager.province = nextArea.province;
      manager.region = keep.includes('region') ? nextArea.region ?? null : null;
      manager.district = keep.includes('district')
        ? nextArea.district ?? null
        : null;
      manager.tehsil = keep.includes('tehsil') ? nextArea.tehsil ?? null : null;
      await this.managersRepository.save(manager);
    }

    const user = await this.usersService.findById(manager.userId);
    return this.toDetail(
      manager,
      user?.email ?? '',
      user?.name ?? '',
      user?.phone ?? null,
      user?.isActive ?? false,
      Boolean(manager.setupToken),
    );
  }

  async resendSetup(id: string) {
    const manager = await this.managersRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!manager) {
      throw new NotFoundException('Area manager not found');
    }
    if (!manager.user?.email) {
      throw new BadRequestException('This manager has no email on file');
    }
    const setupToken = randomBytes(32).toString('hex');
    const setupTokenExpiresAt = new Date();
    setupTokenExpiresAt.setDate(
      setupTokenExpiresAt.getDate() + SETUP_TOKEN_TTL_DAYS,
    );
    manager.setupToken = setupToken;
    manager.setupTokenExpiresAt = setupTokenExpiresAt;
    await this.managersRepository.save(manager);

    const label = this.scopeLabel({
      level: manager.level,
      province: manager.province,
      region: manager.region,
      district: manager.district,
      tehsil: manager.tehsil,
    });
    await this.sendSetupEmail(
      manager.user.email,
      manager.user.name,
      label,
      setupToken,
    );
    return { message: 'Setup link re-sent' };
  }

  async removeAreaManager(id: string) {
    const manager = await this.managersRepository.findOne({ where: { id } });
    if (!manager) {
      throw new NotFoundException('Area manager not found');
    }
    const userId = manager.userId;
    await this.managersRepository.delete(id);
    // The user row has no owned institutions/students, so it is safe to drop.
    await this.usersService.remove(userId).catch(() => undefined);
    return { message: 'Area manager removed' };
  }

  private toDetail(
    manager: AreaManager,
    email: string,
    name: string,
    phone: string | null,
    isActive: boolean,
    pendingSetup: boolean,
  ) {
    return {
      id: manager.id,
      userId: manager.userId,
      name,
      email,
      phone,
      isActive,
      pendingSetup,
      level: manager.level,
      province: manager.province,
      region: manager.region,
      district: manager.district,
      tehsil: manager.tehsil,
      label: this.scopeLabel({
        level: manager.level,
        province: manager.province,
        region: manager.region,
        district: manager.district,
        tehsil: manager.tehsil,
      }),
      createdAt: manager.createdAt,
    };
  }
}
