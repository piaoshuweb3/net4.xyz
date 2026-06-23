import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/services/prisma.service';
import { EmailService } from '../../common/services/email.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '7d',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);

    jest.clearAllMocks();
  });

  describe('registerWithEmail', () => {
    const registerInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user-id',
        email: registerInput.email,
      });

      await expect(
        service.registerWithEmail(registerInput.email, registerInput.password),
      ).rejects.toThrow(ConflictException);
    });

    it('should create a new user and return token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: registerInput.email,
        address: '0x123...',
        isVerified: false,
      });
      mockJwtService.sign.mockReturnValue('mock-jwt-token');
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.registerWithEmail(
        registerInput.email,
        registerInput.password,
      );

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerInput.email);
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });
  });

  describe('loginWithEmail', () => {
    const loginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.loginWithEmail(loginInput.email, loginInput.password),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: loginInput.email,
        password: 'hashed-password',
      });

      // Mock bcrypt.compare to return false
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false);

      await expect(
        service.loginWithEmail(loginInput.email, loginInput.password),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user and token on successful login', async () => {
      const hashedPassword = await require('bcrypt').hash('password123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: loginInput.email,
        password: hashedPassword,
        address: '0x123...',
        isVerified: true,
      });
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.loginWithEmail(
        loginInput.email,
        loginInput.password,
      );

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
    });
  });

  describe('loginWithWallet', () => {
    const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';

    it('should create a new user if wallet not registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        address: walletAddress.toLowerCase(),
        isVerified: true,
      });
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.loginWithWallet(walletAddress);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should return existing user if wallet already registered', async () => {
      const existingUser = {
        id: 'existing-user-id',
        address: walletAddress.toLowerCase(),
        isVerified: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.loginWithWallet(walletAddress);

      expect(result).toHaveProperty('token');
      expect(result.user.address).toBe(walletAddress.toLowerCase());
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user for valid token', async () => {
      const payload = { sub: 'user-id', email: 'test@example.com' };
      mockJwtService.verify.mockReturnValue(payload);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        address: '0x123...',
      });

      const result = await service.validateToken('valid-token');

      expect(result).toHaveProperty('id');
    });
  });
});