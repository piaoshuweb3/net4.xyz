import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // CORS 配置
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // GraphQL 路径
  const graphqlPath = configService.get('GRAPHQL_PATH', '/graphql');

  // 启动服务
  const port = configService.get('PORT', 4000);
  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🌍 net4.xyz Backend Server                              ║
║                                                           ║
║   GraphQL: http://localhost:${port}${graphqlPath}              ║
║   Health:   http://localhost:${port}/health                    ║
║                                                           ║
║   Environment: ${configService.get('NODE_ENV', 'development')}                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();