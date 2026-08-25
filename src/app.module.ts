import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './lib/database/prisma.module';
import { UsersModule } from './module/users/users.module';
import { DepartmentsModule } from './module/departments/departments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
  ],
})
export class AppModule {}
