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
import { GoogleMeetService } from './google.service';



@Module({
  imports: [UserModule, AuthModule,ConfigModule.forRoot(), UtilsModule, DoctorModule,MulterModule.register({
    dest: './uploads', // Set your upload directory
  }) ],
  controllers: [UserController,AuthController,],
  providers: [AuthService,PrismaService,UserService,JwtService,UtilsService, StorageService,GoogleMeetService],
})
export class AppModule {}
