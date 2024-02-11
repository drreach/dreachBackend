import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateSheduleDto, bookAppointmentDTO } from 'src/user/dto/user.dto';
import { formatISO } from 'date-fns';

@Controller('doctor')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post('updateShedules')
  async updateShedules(@Body() dto:UpdateSheduleDto) {
    console.log(dto)
    return this.doctorService.updatShedule(dto);
  }

  @Get('getShedules/:userId')
    async getShedules(@Param("userId") userId: string) {
        return this.doctorService.getSheudle(userId);
    }
 
  @Post('uploadDoctorProfile')
  @UseInterceptors(FileInterceptor('profileImage'))
  async uploadDoctorProfile(@UploadedFile() file: Express.Multer.File,@Body() dto:{userId:string}) {
    console.log(file,dto);

    return this.doctorService.uploadDoctorProfile(dto.userId,file);
  }



  @Get('getDoctorProfile')
  async getDoctorProfile(@Query('username') username: string,@Query("userId") userId:string|undefined) {
    console.log(username,userId)
    
    return this.doctorService.sheduleThings(username,userId);
  }

  
  @Post('checkDoctorAvailability')
  async checkAvailabilty(@Body() dto:{doctorId:string,date:string,slot:string}){
    return this.doctorService.checkDoctorAvailability(dto.doctorId,dto.date,dto.slot)
  }

  @Post("bookAppointment")
  async bookAppointment(@Body() dto:bookAppointmentDTO){


    console.log(dto,formatISO(dto.appointmentSlotDate));
    return this.doctorService.bookAppointment(dto)
  }


  @Get('getDashInfo/:doctorProfileId')
  async getAppointments(@Param('userId') doctorProfileId: string) {
    return this.doctorService.doctorDashboardInfo(doctorProfileId);
  }


  @Get("getPatients/:doctorProfileId")
  async getPatients(@Param('doctorProfileId') doctorProfileId: string) {
    return this.doctorService.getPatients(doctorProfileId);
  }

  @Post('actionOnPatients')
  async actionOnPatients(@Body() dto:{apptId:string,doctorProfileId,userId:string,action:string}) {
    return this.doctorService.actionOnPatients(dto);
  }
    
}
