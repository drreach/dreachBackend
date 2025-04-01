import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { UserController } from './user/user.controller';
import { AuthController } from './auth/auth.controller';
import { UserService } from './user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UtilsModule } from './utils/utils.module';
import { UtilsService } from './utils/utils.service';
import { DoctorModule } from './doctor/doctor.module';
import { StorageService } from './storage/storage.service';
import { MulterModule } from '@nestjs/platform-express';
import { AdminController } from './admin/admin.controller';
import { AdminModule } from './admin/admin.module';
import { AdminService } from './admin/admin.service';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    UserModule,
    AuthModule,
    ConfigModule.forRoot(),
    UtilsModule,
    DoctorModule,
    MulterModule.register({
      dest: './uploads', // Set your upload directory
    }),
    AdminModule,
    CacheModule.register({
      store: redisStore,
      isGlobal: true,
      host: 'localhost', //default host
      port: 6379, //default port,
      ttl: 100000000000, // seconds
    }),
  ],
  controllers: [UserController, AuthController, AdminController],
  providers: [
    AuthService,
    PrismaService,
    UserService,
    JwtService,
    UtilsService,
    StorageService,
    AdminService,
  ],
})
export class AppModule {}
