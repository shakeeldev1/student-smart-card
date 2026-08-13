import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  emailVerified?: boolean;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

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
}
