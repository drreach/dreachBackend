import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from 'src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UtilsService } from 'src/utils/utils.service';

@Module({ 
  controllers: [UserController],
  providers: [UserService,PrismaService,JwtService,UtilsService]
})
export class UserModule {}
