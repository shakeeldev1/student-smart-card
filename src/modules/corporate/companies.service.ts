import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { Employee } from './entities/employee.entity';
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
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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
    return this.companiesRepository.save(company);
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
