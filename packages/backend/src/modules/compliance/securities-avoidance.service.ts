import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';

export interface SecuritiesComplianceResult {
  allowed: boolean;
  productType: 'nft' | 'service' | 'token';
  messaging: string[];
  warnings: string[];
  classification: 'utility' | 'membership' | 'governance' | 'investment';
  requiresDisclosure: boolean;
}

/**
 * Securities Attribute Avoidance Service
 * 
 * Implements compliance measures to avoid securities classification:
 * - No promise of profits/returns
 * - NFT defined as "technical service credential" not investment
 * - Token rewards tied to node contribution, not investment
 * 
 * Requirements: 10.2
 */
@Injectable()
export class SecuritiesAvoidanceService {
  private readonly logger = new Logger(SecuritiesAvoidanceService.name);

  // Product pricing configuration
  private readonly NFT_PRICES = {
    CORE: 99999,    // $99,999 - Core node (10 NFTs)
    SUB: 9999,      // $9,999 - Sub node (1 NFT)
    BASIC: 999,     // $999 - Basic node
  };

  private readonly SERVICE_PRICES = {
    BASIC: 99,      // $99/year - Basic membership
    MEDIUM: 999,    // $999/year - Medium membership
    ADVANCED: 9999, // $9,999/year - Advanced membership
  };

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Check product compliance for securities attribute avoidance
   */
  async checkProductCompliance(
    productType: 'nft' | 'service' | 'token',
    amount: number,
    paymentMethod?: string,
  ): Promise<SecuritiesComplianceResult> {
    this.logger.log(`Checking securities compliance for product type: ${productType}, amount: ${amount}`);

    const messaging: string[] = [];
    const warnings: string[] = [];
    let classification: 'utility' | 'membership' | 'governance' | 'investment' = 'utility';
    let requiresDisclosure = false;

    if (productType === 'nft') {
      // NFT is classified as "technical service credential"
      classification = 'membership';
      messaging.push(
        'Spark NFT is a technical service credential providing access to AI computing network',
        'NFT grants holder the right to participate in network contribution',
        'Rewards are distributed based on actual computational work performed',
      );

      // Check if amount matches expected NFT pricing
      if (amount >= this.NFT_PRICES.CORE) {
        messaging.push('Core node requires 10 NFTs for network validation responsibilities');
        requiresDisclosure = true;
      } else if (amount >= this.NFT_PRICES.SUB) {
        messaging.push('Sub node provides data synchronization and transaction broadcasting services');
      } else {
        messaging.push('Basic node grants community governance participation rights');
      }

      // Add securities avoidance messaging
      messaging.push(
        'NETWORK CONTRIBUTION REWARD - Not a financial instrument or investment',
        'Value derived from network participation, not speculation',
      );

      warnings.push(
        'NFT value may decrease or become worthless',
        'No guarantee of any returns or profits',
        'Rewards depend on network activity and personal contribution',
      );

    } else if (productType === 'service') {
      // Service is classified as membership with utility
      classification = 'utility';
      messaging.push(
        'Membership provides access to content and services',
        'Annual subscription for platform usage rights',
      );

      if (amount >= this.SERVICE_PRICES.MEDIUM) {
        messaging.push('Advanced membership includes community proposal voting rights');
        classification = 'governance';
      }

      messaging.push(
        'SERVICE FEE - Not an investment or securities offering',
        'No expectation of profit or capital appreciation',
      );

      warnings.push(
        'Service is provided as-is',
        'No financial returns are promised or guaranteed',
      );

    } else if (productType === 'token') {
      // Token is classified as governance token
      classification = 'governance';
      messaging.push(
        'Token provides governance voting rights in the network',
        'Token holders can vote on network parameters and upgrades',
        'Token value is utility-based, not investment-based',
      );

      messaging.push(
        'GOVERNANCE TOKEN - Not a security or investment contract',
        'No profit-sharing or dividend rights',
        'Rewards tied to network contribution, not token holdings',
      );

      warnings.push(
        'Token price may be volatile',
        'No guarantee of liquidity or exchange availability',
        'Governance rights subject to network rules',
      );
      requiresDisclosure = true;
    }

    // Check payment method restrictions (credit card limit)
    if (paymentMethod === 'CREDIT_CARD' && amount > 5000) {
      warnings.push('Credit card payments limited to $5,000 - use cryptocurrency for larger amounts');
    }

    return {
      allowed: true,
      productType,
      messaging,
      warnings,
      classification,
      requiresDisclosure,
    };
  }

  /**
   * Get compliant messaging for display to users
   */
  getCompliantMessaging(productType: 'nft' | 'service' | 'token'): string[] {
    const baseMessages = [
      'This is not an investment or securities offering',
      'No promise of profits, returns, or capital appreciation',
      'Purchase is for access to network services only',
    ];

    if (productType === 'nft') {
      return [
        ...baseMessages,
        'Spark NFT is a technical credential for AI computing network participation',
        'Rewards are distributed based on actual computational work performed',
        'NFT value is derived from network utility, not speculation',
      ];
    } else if (productType === 'service') {
      return [
        ...baseMessages,
        'Membership provides access to platform content and services',
        'Annual fee is for service access, not investment',
      ];
    } else {
      return [
        ...baseMessages,
        'Token provides governance voting rights only',
        'No financial returns or profit participation',
      ];
    }
  }

  /**
   * Validate that product descriptions don't contain securities violations
   */
  async validateProductDescription(description: string): Promise<{ valid: boolean; violations: string[] }> {
    const violations: string[] = [];
    const lowerDesc = description.toLowerCase();

    // Keywords that indicate securities-like messaging
    const prohibitedKeywords = [
      { keyword: 'profit', message: 'Cannot promise profits' },
      { keyword: 'return', message: 'Cannot promise returns' },
      { keyword: 'interest', message: 'Cannot promise interest' },
      { keyword: 'dividend', message: 'Cannot promise dividends' },
      { keyword: 'yield', message: 'Cannot promise yield' },
      { keyword: 'earn', message: 'Cannot claim users will earn money' },
      { keyword: 'gain', message: 'Cannot promise capital gains' },
      { keyword: 'roi', message: 'Cannot mention ROI' },
      { keyword: 'investment', message: 'Cannot describe as investment' },
      { keyword: 'financial return', message: 'Cannot promise financial returns' },
    ];

    for (const { keyword, message } of prohibitedKeywords) {
      if (lowerDesc.includes(keyword)) {
        violations.push(message);
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Get product classification for compliance records
   */
  getProductClassification(productType: 'nft' | 'service' | 'token'): {
    classification: string;
    regulatoryExemption: string;
    description: string;
  } {
    switch (productType) {
      case 'nft':
        return {
          classification: 'Utility/Membership Token',
          regulatoryExemption: 'Not a security - NFT provides technical service access',
          description: 'Spark NFT grants holder access to AI computing network participation rights',
        };
      case 'service':
        return {
          classification: 'Service Subscription',
          regulatoryExemption: 'Not a security - Annual membership for service access',
          description: 'Platform membership provides access to content and services',
        };
      case 'token':
        return {
          classification: 'Governance Token',
          regulatoryExemption: 'Not a security - Governance token for network voting',
          description: 'Network token provides governance voting rights only',
        };
    }
  }
}