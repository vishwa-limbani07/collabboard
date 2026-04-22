import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS so Angular can talk to this server
  app.enableCors({
    origin: 'http://localhost:4200',  // Your Angular dev server
    credentials: true,
  });

  // This makes class-validator DTOs actually work
  // Without this, your @IsEmail() and @MinLength() decorators do nothing
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,      // Strip properties not in the DTO
    forbidNonWhitelisted: true,  // Throw error if unknown properties are sent
    transform: true,      // Auto-transform types
  }));

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();