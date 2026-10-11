import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { Employee } from './entities/employee.entity';
import { FranchiseSettings } from '../area/entities/franchise-settings.entity';
import {
  buildReferralCode,
  referralCodePrefix,
} from '../area/franchise-code.util';
import { InstitutionApprovalStatus } from '../institutions/enums/institution-approval-status.enum';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { parseDateRange } from '../../common/utils/date-range.util';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import type { Multer } from 'multer';

export interface CompanyAdminFilters {
  status?: InstitutionApprovalStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateCompanyInput {
  ownerUserId: string;
  name: string;
  registrationNumber: string;
  address: string;
  city: string;
  province?: string;
  region?: string;
  district?: string;
  tehsil?: string;
  contactNumber: string;
  officialEmail: string;
  hrPersonName: string;
  authorizedPersonDesignation: string;
  authorizedPersonCnic: string;
  authorizedPersonMobile: string;
  numberOfEmployees: number;
}

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(FranchiseSettings)
    private readonly settingsRepository: Repository<FranchiseSettings>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ---------------------------------------------------------------------------
  // Referral programme: a reference code per company + per-head earnings.
  // Attribution rides the existing employee.companyId link; the code is only an
  // identifier for admin management and payouts.
  // ---------------------------------------------------------------------------

  /** Generate + persist a unique SSC-COR reference code if the company lacks one. */
  async ensureReferralCode(company: Company): Promise<string> {
    if (company.referralCode) return company.referralCode;
    const prefix = referralCodePrefix('COR', company.province, company.district);
    const existing = await this.companiesRepository
      .createQueryBuilder('c')
      .where('c.referralCode LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    let serial = existing + 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const code = buildReferralCode(
        'COR',
        company.province,
        company.district,
        serial,
      );
      const clash = await this.companiesRepository.findOne({
        where: { referralCode: code },
      });
      if (!clash) {
        company.referralCode = code;
        await this.companiesRepository.save(company);
        return code;
      }
      serial += 1;
    }
  }

  private async getCommissionPerEmployee(): Promise<number> {
    const settings = await this.settingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });
    return settings?.commissionPerEmployee ?? 0;
  }

  /** total + confirmed-paid employee counts per company id. */
  private async getEmployeeReferralStats(
    companyIds: string[],
  ): Promise<Map<string, { total: number; confirmed: number }>> {
    const map = new Map<string, { total: number; confirmed: number }>();
    if (companyIds.length === 0) return map;
    const rows = await this.employeesRepository
      .createQueryBuilder('e')
      .select('e.companyId', 'cid')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN p.status = :confirmed THEN 1 ELSE 0 END)`,
        'confirmed',
      )
      .leftJoin('payments', 'p', 'p."employeeId" = e.id')
      .where('e.companyId IN (:...ids)', { ids: companyIds })
      .setParameter('confirmed', 'confirmed')
      .groupBy('e.companyId')
      .getRawMany<{ cid: string; total: string; confirmed: string }>();
    for (const r of rows) {
      map.set(r.cid, {
        total: Number(r.total),
        confirmed: Number(r.confirmed ?? 0),
      });
    }
    return map;
  }

  /** Self-service: one company's code, registration counts and earnings. */
  async getMyReferral(ownerUserId: string) {
    const company = await this.findByOwnerUserId(ownerUserId);
    if (!company) {
      throw new NotFoundException('No company found for this account');
    }
    const code = await this.ensureReferralCode(company);
    const [stats, rate] = await Promise.all([
      this.getEmployeeReferralStats([company.id]),
      this.getCommissionPerEmployee(),
    ]);
    const s = stats.get(company.id) ?? { total: 0, confirmed: 0 };
    return {
      code,
      totalEmployees: s.total,
      confirmedEmployees: s.confirmed,
      commissionPerEmployee: rate,
      earnings: s.confirmed * rate,
    };
  }

  /** Admin: every company with its code, counts and earnings. */
  async listReferralStatsForAdmin() {
    const companies = await this.companiesRepository.find({
      order: { createdAt: 'DESC' },
    });
    for (const c of companies) {
      if (!c.referralCode) await this.ensureReferralCode(c);
    }
    const [stats, rate] = await Promise.all([
      this.getEmployeeReferralStats(companies.map((c) => c.id)),
      this.getCommissionPerEmployee(),
    ]);
    return companies.map((c) => {
      const s = stats.get(c.id) ?? { total: 0, confirmed: 0 };
      return {
        id: c.id,
        name: c.name,
        city: c.city,
        referralCode: c.referralCode,
        totalEmployees: s.total,
        confirmedEmployees: s.confirmed,
        commissionPerEmployee: rate,
        earnings: s.confirmed * rate,
      };
    });
  }

  createWithManager(
    manager: EntityManager,
    input: CreateCompanyInput,
  ): Promise<Company> {
    const company = manager.create(Company, input);
    return manager.save(company);
  }

  findByOwnerUserId(ownerUserId: string): Promise<Company | null> {
    return this.companiesRepository.findOne({ where: { ownerUserId } });
  }

  findByRegistrationNumber(registrationNumber: string): Promise<Company | null> {
    return this.companiesRepository.findOne({ where: { registrationNumber } });
  }

  async findById(id: string): Promise<Company> {
    const company = await this.companiesRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async approve(id: string, approvedByUserId: string): Promise<Company> {
    const company = await this.findById(id);
    company.approvalStatus = InstitutionApprovalStatus.APPROVED;
    company.approvedByUserId = approvedByUserId;
    company.approvedAt = new Date();
    company.rejectionReason = null;
    const saved = await this.companiesRepository.save(company);
    // Assign a reference code on approval so it exists before the company asks.
    await this.ensureReferralCode(saved).catch(() => undefined);
    return saved;
  }

  async reject(id: string, reason?: string): Promise<Company> {
    const company = await this.findById(id);
    company.approvalStatus = InstitutionApprovalStatus.REJECTED;
    company.rejectionReason = reason ?? null;
    return this.companiesRepository.save(company);
  }

  async findAllAdmin(
    filters: CompanyAdminFilters = {},
  ): Promise<Array<Company & { enrolledEmployees: number }>> {
    const qb = this.companiesRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.ownerUser', 'ownerUser');

    if (filters.status) {
      qb.andWhere('company.approvalStatus = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere(
        '(company.name ILIKE :search OR company.registrationNumber ILIKE :search OR company.city ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    const { from, to } = parseDateRange(filters.startDate, filters.endDate);
    if (from) qb.andWhere('company.createdAt >= :fromDate', { fromDate: from });
    if (to) qb.andWhere('company.createdAt <= :toDate', { toDate: to });

    qb.orderBy('company.createdAt', 'DESC');
    const companies = await qb.getMany();
    if (companies.length === 0) return [];

    const counts = await this.employeesRepository
      .createQueryBuilder('employee')
      .select('employee.companyId', 'companyId')
      .addSelect('COUNT(*)', 'count')
      .where('employee.companyId IN (:...ids)', {
        ids: companies.map((c) => c.id),
      })
      .groupBy('employee.companyId')
      .getRawMany<{ companyId: string; count: string }>();
    const byCompany = new Map(counts.map((r) => [r.companyId, Number(r.count)]));

    return companies.map((company) => ({
      ...company,
      enrolledEmployees: byCompany.get(company.id) ?? 0,
    }));
  }

  async updateOwn(ownerUserId: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findByOwnerUserId(ownerUserId);
    if (!company) {
      throw new NotFoundException('No company found for this account');
    }
    Object.assign(company, dto);
    return this.companiesRepository.save(company);
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findById(id);
    Object.assign(company, dto);
    return this.companiesRepository.save(company);
  }

  async uploadOwnLogo(
    ownerUserId: string,
    file: Multer.File,
  ): Promise<{ logoUrl: string }> {
    const company = await this.findByOwnerUserId(ownerUserId);
    if (!company) {
      throw new NotFoundException('No company found for this account');
    }
    const uploaded = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      'student-smart-card/company-logos',
      file.originalname,
    );
    const previousPublicId = company.logoPublicId;
    company.logoUrl = uploaded.url;
    company.logoPublicId = uploaded.publicId;
    await this.companiesRepository.save(company);
    if (previousPublicId) {
      await this.cloudinaryService.destroy(previousPublicId);
    }
    return { logoUrl: uploaded.url };
  }
}
