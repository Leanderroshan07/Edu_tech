import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './lib/database/prisma.module';
import { UsersModule } from './module/users/users.module';
import { DepartmentsModule } from './module/departments/departments.module';
import { SubjectsModule } from './module/subjects/subjects.module';
import { RequestsModule } from './module/requests/requests.module';
import { MaterialsModule } from './module/materials/materials.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    SubjectsModule,
    RequestsModule,
    MaterialsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

