import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { DNSRecordType } from '@prisma/client';
import { RegisterDomainInput, UpdateDomainInput } from './dto/domain.input';

@Injectable()
export class DomainService {
  // 域名价格配置
  private readonly DOMAIN_PRICES: Record<string, number> = {
    '3': 99,    // 3字符域名
    '4': 49,    // 4字符域名
    '5': 29,    // 5字符域名
    '6+': 19,   // 6字符及以上
  };

  // 保留域名列表
  private readonly RESERVED_NAMES = [
    'www', 'api', 'admin', 'mail', 'ftp', 'test', 'demo',
    'net4', 'web4', 'afc', 'spark', 'mirrome', 'blockchain',
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * 获取域名价格
   */
  getDomainPrice(name: string): number {
    const length = name.length;
    
    if (length <= 3) return this.DOMAIN_PRICES['3'];
    if (length === 4) return this.DOMAIN_PRICES['4'];
    if (length === 5) return this.DOMAIN_PRICES['5'];
    return this.DOMAIN_PRICES['6+'];
  }

  /**
   * 检查域名是否可用
   */
  async checkAvailability(name: string): Promise<boolean> {
    const normalizedName = name.toLowerCase();
    
    // 检查保留域名
    if (this.RESERVED_NAMES.includes(normalizedName)) {
      return false;
    }

    // 检查数据库
    const existing = await this.prisma.domain.findUnique({
      where: { name: normalizedName },
    });

    return !existing;
  }

  /**
   * 注册域名
   */
  async register(userId: string, input: RegisterDomainInput) {
    const normalizedName = input.name.toLowerCase();

    // 检查保留域名
    if (this.RESERVED_NAMES.includes(normalizedName)) {
      throw new BadRequestException('This domain name is reserved');
    }

    // 检查是否已存在
    const existing = await this.prisma.domain.findUnique({
      where: { name: normalizedName },
    });

    if (existing) {
      throw new BadRequestException('Domain name already taken');
    }

    // 获取价格
    const price = this.getDomainPrice(normalizedName);

    // 计算到期时间（1年）
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // 创建域名
    const domain = await this.prisma.domain.create({
      data: {
        name: normalizedName,
        ownerId: userId,
        recordType: input.recordType as DNSRecordType,
        recordValue: input.recordValue,
        price,
        expiryDate,
      },
    });

    return {
      ...domain,
      fullName: `${normalizedName}.web4`,
    };
  }

  /**
   * 续费域名
   */
  async renew(domainId: string, userId: string, years: number = 1) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (domain.ownerId !== userId) {
      throw new BadRequestException('Not authorized');
    }

    // 计算新到期时间
    let newExpiry = domain.expiryDate;
    if (newExpiry < new Date()) {
      newExpiry = new Date();
    }
    newExpiry.setFullYear(newExpiry.getFullYear() + years);

    return this.prisma.domain.update({
      where: { id: domainId },
      data: { expiryDate: newExpiry },
    });
  }

  /**
   * 更新域名解析记录
   */
  async updateRecord(domainId: string, userId: string, input: UpdateDomainInput) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (domain.ownerId !== userId) {
      throw new BadRequestException('Not authorized');
    }

    if (domain.isLocked) {
      throw new BadRequestException('Domain is locked');
    }

    return this.prisma.domain.update({
      where: { id: domainId },
      data: {
        recordType: input.recordType as DNSRecordType,
        recordValue: input.recordValue,
      },
    });
  }

  /**
   * 转让域名
   */
  async transfer(domainId: string, userId: string, newOwnerId: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (domain.ownerId !== userId) {
      throw new BadRequestException('Not authorized');
    }

    if (domain.isLocked) {
      throw new BadRequestException('Domain is locked');
    }

    return this.prisma.domain.update({
      where: { id: domainId },
      data: { ownerId: newOwnerId },
    });
  }

  /**
   * 锁定/解锁域名
   */
  async toggleLock(domainId: string, isLocked: boolean, reason?: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return this.prisma.domain.update({
      where: { id: domainId },
      data: {
        isLocked,
        lockReason: reason,
      },
    });
  }

  /**
   * 获取域名详情
   */
  async getById(domainId: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: {
        owner: {
          select: {
            id: true,
            address: true,
            email: true,
          },
        },
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return {
      ...domain,
      fullName: `${domain.name}.web4`,
    };
  }

  /**
   * 根据名称获取域名
   */
  async getByName(name: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { name: name.toLowerCase() },
      include: {
        owner: {
          select: {
            id: true,
            address: true,
          },
        },
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return {
      ...domain,
      fullName: `${domain.name}.web4`,
    };
  }

  /**
   * 获取用户域名列表
   */
  async getUserDomains(userId: string) {
    return this.prisma.domain.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取域名列表
   */
  async getList(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [domains, total] = await Promise.all([
      this.prisma.domain.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              address: true,
            },
          },
        },
      }),
      this.prisma.domain.count(),
    ]);

    return {
      items: domains.map((d) => ({
        ...d,
        fullName: `${d.name}.web4`,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 搜索域名
   */
  async search(query: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [domains, total] = await Promise.all([
      this.prisma.domain.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.domain.count({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
      }),
    ]);

    return {
      items: domains.map((d) => ({
        ...d,
        fullName: `${d.name}.web4`,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 解析域名
   */
  async resolve(name: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { name: name.toLowerCase() },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return {
      name: domain.name,
      fullName: `${domain.name}.web4`,
      recordType: domain.recordType,
      recordValue: domain.recordValue,
      owner: domain.ownerId,
    };
  }

  /**
   * 获取即将到期的域名
   */
  async getExpiringDomains(days: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.domain.findMany({
      where: {
        expiryDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }
}