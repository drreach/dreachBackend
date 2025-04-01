import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  bookAppointmentDTO,
  hybridBookAppointmentDTO,
} from 'src/user/dto/user.dto';
import { formatISO } from 'date-fns';
import moment from 'moment';
import { UpdateDoctorDetailsDto, UpdateSheduleDto } from './dto/dto';

@Controller('doctor')
export class DoctorController {
  // constructor(
  //   private readonly doctorService: DoctorService,
  // ) {}
  // @Post('updateDoctorProfile')
  // async updateDoctorProfile(@Body() doctorProfile: UpdateDoctorDetailsDto) {
  //   console.log(doctorProfile);
  //   return await this.doctorService.updateDoctorsProfileDetails(doctorProfile);
  // }
  // @Get('getDoctor/:userId')
  // async getDoctorById(@Param('userId') userId: string) {
  //   return this.doctorService.getDoctorById(userId);
  // }
  // @Post('updateShedules')
  // async updateShedules(@Body() dto: UpdateSheduleDto) {
  //   console.log(dto);
  //   return this.doctorService.updatShedule(dto);
  // }
  // @Get('getShedules/:userId')
  // async getShedules(@Param('userId') userId: string) {
  //   console.log(userId);
  //   return this.doctorService.getSheudle(userId);
  // }
  // @Post('uploadDoctorProfile')
  // @UseInterceptors(FileInterceptor('profileImage'))
  // async uploadDoctorProfile(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Body() dto: { userId: string },
  // ) {
  //   console.log(file, dto);
  //   return this.doctorService.uploadDoctorProfile(dto.userId, file);
  // }
  // getLocalTimezone() {
  //   const currentDateInServerTimeZone = new Date();
  //   const istOffsetMilliseconds = 5.5 * 60 * 60 * 1000;
  //   const s = new Date(
  //     currentDateInServerTimeZone.getTime() + istOffsetMilliseconds,
  //   );
  //   return s;
  // }
  // @Get('getDoctorProfile')
  // async getDoctorProfile(
  //   @Query()
  //   dto: {
  //     username: string;
  //     userId: string;
  //     date: string;
  //     clientCurrentTimezone: string;
  //   },
  // ) {
  //   return this.doctorService.getDoctorDetails(
  //     dto.username,
  //     this.getLocalTimezone(),
  //     dto.userId,
  //   );
  // }
  // @Get('getdoctorProfilebyVideo')
  // async getDoctorProfilebyVideo(
  //   @Query()
  //   dto: {
  //     username: string;
  //     userId: string;
  //     slectedDateByClient: string;
  //     slot: string;
  //   },
  // ) {
  //   // console.log(username,userId)
  //   return this.doctorService.getSlotsByVideoConsult(
  //     dto.username,
  //     dto.slectedDateByClient,
  //     this.getLocalTimezone(),
  //     dto.userId,
  //     dto.slot,
  //   );
  // }
  // @Get('getdoctorProfilebyHome')
  // async getDoctorProfilebyHome(
  //   @Query() dto: { username: string; userId: string },
  // ) {
  //   // console.log(dto)
  //   return this.doctorService.getSheduleByHome(
  //     dto.username,
  //     this.getLocalTimezone(),
  //     dto.userId,
  //   );
  // }
  // @Post('checkDoctorAvailability')
  // async checkAvailabilty(
  //   @Body() dto: { doctorId: string; date: string; slot: string; mode: string },
  // ) {
  //   return this.doctorService.checkDoctorAvailability(
  //     dto.doctorId,
  //     dto.date,
  //     dto.slot,
  //     dto.mode,
  //   );
  // }
  // @Post('hybridcheckDoctorAvailability')
  // async hybridCheckAvailabilty(
  //   @Body()
  //   dto: {
  //     homeVisitDoctorId: string;
  //     h_apptDate: string;
  //     h_slotTime: string;
  //     videoDoctorId: string;
  //     v_apptDate: string;
  //     v_slotTime: string;
  //   },
  // ) {
  //   return this.doctorService.hybridCheckDoctorAvailability(dto);
  // }
  // @Post('bookAppointment')
  // async bookAppointment(@Body() dto: any) {
  //   console.log(dto, formatISO(dto.appointmentSlotDate));
  //   return this.doctorService.bookAppointment(dto);
  // }
  // @Post('hybridBookAppointment')
  // async hybridBookAppointment(@Body() dto: hybridBookAppointmentDTO) {
  //   console.log(dto);
  //   return this.doctorService.hybridBookAppointment(dto);
  // }
  // @Get('getDashInfo')
  // async getAppointments(@Query() dto: { userId: string }) {
  //   console.log(dto);
  //   return this.doctorService.doctorDashboardInfo(
  //     dto.userId,
  //     this.getLocalTimezone(),
  //   );
  // }
  // @Get('getPatients/:doctorProfileId')
  // async getPatients(@Param('doctorProfileId') doctorProfileId: string) {
  //   return this.doctorService.getPatients(doctorProfileId);
  // }
  // @Post('actionOnPatients')
  // async actionOnPatients(
  //   @Body()
  //   dto: {
  //     apptId: string;
  //     doctorProfileId: string;
  //     userId: string;
  //     action: string;
  //   },
  // ) {
  //   return this.doctorService.actionOnPatients(dto);
  // }
  // @Get('getPatientsMedicalByDoctor')
  // async getPatientsByIdByDoctor(
  //   @Query() dto: { pid: string; doctorId: string },
  // ) {
  //   return this.doctorService.getPatientsMedicalByDoctor(dto.pid, dto.doctorId);
  // }
  // @Get('getPatientsMedicalBySelf')
  // async getPatientsByIdBySelf(@Query() dto: { userId: string }) {
  //   return this.doctorService.getPatientsMedicalBySelf(dto.userId);
  // }
  // @Get('getPatientsInfo')
  // async getPatientsInfo(@Query('pid') patientId: string) {
  //   return this.doctorService.getPatientsInfo(patientId);
  // }
  // @Post('addMedicalRecord')
  // @UseInterceptors(FileInterceptor('file'))
  // async addMedicalRecord(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Body() dto: { patientsId: string; doctorId: string; description: string },
  // ) {
  //   console.log(file, dto);
  //   return this.doctorService.addMedicalRecord(
  //     dto.patientsId,
  //     dto.doctorId,
  //     file,
  //     dto.description,
  //   );
  // }
  // @Post('addDocuments')
  // @UseInterceptors(FileInterceptor('document'))
  // async addDocuments(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Body('doctorId') doctorId: string,
  // ) {
  //   return this.doctorService.addDocuments(doctorId, file);
  // }
  // @Post('removeDocuments')
  // async removeDocuments(@Body('doctorId') doctorId: string) {
  //   return this.doctorService.removeDocuments(doctorId);
  // }
}
