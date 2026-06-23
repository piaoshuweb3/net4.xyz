// net4.xyz: 注册 Prisma 枚举为 GraphQL 枚举类型
import { registerEnumType } from '@nestjs/graphql';
import {
  MemberLevel,
  ContentType,
  ContentStatus,
  NodeType,
  NodeStatus,
  TaskStatus,
  AIModelType,
  PaymentMethod,
  PaymentStatus,
  PunishmentType,
  AppealStatus,
  AIAvatarStatus,
  DNSRecordType,
  MediaType,
  TransactionType,
  TransactionStatus,
  BookStatus,
  SaleStatus,
  TipStatus,
  RevenueType,
  RevenueStatus,
} from '@prisma/client';

// 注册所有 Prisma 枚举
registerEnumType(MemberLevel, { name: 'MemberLevel' });
registerEnumType(ContentType, { name: 'ContentType' });
registerEnumType(ContentStatus, { name: 'ContentStatus' });
registerEnumType(NodeType, { name: 'NodeType' });
registerEnumType(NodeStatus, { name: 'NodeStatus' });
registerEnumType(TaskStatus, { name: 'TaskStatus' });
registerEnumType(AIModelType, { name: 'AIModelType' });
registerEnumType(PaymentMethod, { name: 'PaymentMethod' });
registerEnumType(PaymentStatus, { name: 'PaymentStatus' });
registerEnumType(PunishmentType, { name: 'PunishmentType' });
registerEnumType(AppealStatus, { name: 'AppealStatus' });
registerEnumType(AIAvatarStatus, { name: 'AIAvatarStatus' });
registerEnumType(DNSRecordType, { name: 'DNSRecordType' });
registerEnumType(MediaType, { name: 'MediaType' });
registerEnumType(TransactionType, { name: 'TransactionType' });
registerEnumType(TransactionStatus, { name: 'TransactionStatus' });
registerEnumType(BookStatus, { name: 'BookStatus' });
registerEnumType(SaleStatus, { name: 'SaleStatus' });
registerEnumType(TipStatus, { name: 'TipStatus' });
registerEnumType(RevenueType, { name: 'RevenueType' });
registerEnumType(RevenueStatus, { name: 'RevenueStatus' });
