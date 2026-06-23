import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './services/prisma.service';
import { S3Service } from './services/s3.service';
import { IpfsService } from './services/ipfs.service';
import { EmailService } from './services/email.service';
import { AuditService } from './services/audit.service';
import { JSONScalar } from './scalars/json.scalar';
import './scalars/prisma-enums';

@Global()
@Module({
  providers: [
    PrismaService,
    S3Service,
    {
      provide: 'S3_SERVICE',
      useFactory: (configService: ConfigService) => new S3Service(configService),
      inject: [ConfigService],
    },
    IpfsService,
    EmailService,
    AuditService,
    JSONScalar,
  ],
  exports: [PrismaService, S3Service, 'S3_SERVICE', IpfsService, EmailService, AuditService, JSONScalar],
})
export class CommonModule {}