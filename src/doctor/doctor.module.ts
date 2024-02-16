import { Module } from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { DoctorController } from './doctor.controller';
import { PrismaService } from 'src/prisma.service';
import { StorageService } from 'src/storage/storage.service';
import { GoogleMeetService } from 'src/google.service';

@Module({
  providers: [DoctorService,PrismaService,StorageService,GoogleMeetService],
  controllers: [DoctorController]
})
export class DoctorModule {}
