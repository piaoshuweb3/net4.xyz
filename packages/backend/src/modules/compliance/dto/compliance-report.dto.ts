import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ComplianceReportDto {
  @Field()
  reportId: string;

  @Field()
  reportType: string;

  @Field()
  generatedAt: Date;

  @Field(() => Object)
  period: {
    startDate: Date;
    endDate: Date;
  };

  @Field(() => Object)
  amlReport: any;

  @Field(() => Object)
  refundReport: any;

  @Field(() => Object)
  securitiesReport: any;

  @Field(() => Object)
  riskMetrics: any;
}
