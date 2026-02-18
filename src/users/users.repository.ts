import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from 'src/common/rbac/role.enum';

const userSafeSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    email: string;
    name: string;
    role: any;
    passwordHash: string;
    isActive?: boolean;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        passwordHash: data.passwordHash,
        isActive: data.isActive ?? true,
      },
      select: userSafeSelect,
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: userSafeSelect });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, select: userSafeSelect });
  }

  findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...userSafeSelect, passwordHash: true },
    });
  }

  findAll(role?: Role){
    return this.prisma.user.findMany({
      where: {role}
    })
  }
}
