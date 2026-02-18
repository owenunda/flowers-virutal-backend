import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersRepository } from './users.repository';
import { Role } from 'src/common/rbac/role.enum';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async create(dto: CreateUserDto) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.repo.create({
      email: dto.email,
      name: dto.name,
      role: dto.role,
      passwordHash,
      isActive: true,
    });
  }

  findAll(role?: Role) {
    return this.repo.findAll(role);
  }

  findById(id: string) {
    return this.repo.findById(id);
  }

  findByEmailWithPassword(email: string) {
    return this.repo.findByEmailWithPassword(email);
  }
}
