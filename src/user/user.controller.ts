import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JWTGuard } from 'src/auth/guard/jtw.guard';
import { Address, UpdateUserDetailsDto } from './dto/user.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('register')
  async authinticate(
    @Body()
    dto: {
      phone: string;
      firstName: string;
      lastName: string;
      password: string;
    },
  ) {
    console.log(dto);
    return this.userService.registerUser(dto);
  }

  @Post('verifyUserRegistration')
  async verifyUserRegistration(@Body() dto: { phone: string; otp: number }) {
    console.log(dto);
    return this.userService.verifyUserRegistration(dto.phone, dto.otp);
  }

  @Post('login')
  async login(@Body() dto: { phone: string; password: string }) {
    console.log(dto);
    return this.userService.login(dto);
  }
  // @Post('verifyOtp')
  // async verifyOtp(@Body() dto: {phone:string,otp:string}) {
  //   console.log(dto)
  //   return this.userService.verifyOtp(dto.phone,dto.otp);
  // }

  //creating new User
  // @Post('signup')
  // async signup(@Body('email') email: string) {
  //   return await this.userService.createUser(email);
  // }

  // //creating doctor profile if user wants to apply for doctor
  // @Post('createDoctorProfile')
  // async createDoctorProfile(@Body('userId') userId: string) {
  //   return await this.userService.createDoctorProfile(userId);
  // }

  // //updating the existing user
  // // @Post('updateUser')
  // // async updateUser(@Body() dto: UpdateUserDetailsDto) {
  // //   console.log(dto);
  // //   return this.userService.updatePatientsProfile(dto);
  // // }

  // @Post('updateUser')
  // @UseInterceptors(FileInterceptor('profileImage'))
  // async uploadDoctorProfile(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Body() dto: UpdateUserDetailsDto,
  // ) {

  //   const {Address,...res } = dto;
  //   const address = JSON.parse(Address);
  //   console.log(file, address,res);

  //   return this.userService.updatePatientsProfile({Address:address,...res}, file);
  // }

  // //getting the user profile using user Id
  // @Get('getuser/:userId')
  // async getUserById(@Param('userId') userId: string) {
  //   return this.userService.getUserById(userId);
  // }

  // //
  // @Get('getApprovedDoctors')
  // async getApprovedDoctors() {
  //   return this.userService.getApprovedDoctors();
  // }

  // @Get('getPatients')
  // async getPatients() {
  //   return this.userService.getPatients();
  // }

  // @Get('findDoctorList')
  // async findDoctorList(@Query() dto: { speciality: string; address: string,mode:string }) {
  //   console.log(dto);
  //   return this.userService.findDoctorsList(dto);
  // }

  // @Get('findDoctorbyHomeVisit')
  // async findDoctorbyHomeVisit() {
  //   return this.userService.findDoctorByHomeVisit();
  // }

  // @Get('findDoctorbyVideoConsultation')
  // async findDoctorByVideoConsultation(
  //   @Query() dto: { date: string; slot: string },
  // ) {
  //   console.log(dto);
  //   return this.userService.findDoctorByVideoConsultation(dto);
  // }

  // @Get('getDoctorProfile/:username')
  // async getDoctorProfile(@Param('username') username: string) {
  //   console.log(username);
  //   return this.userService.getDoctroByUsername(username);
  // }

  // @Get('getAppointments/:userId')
  // async getAppointmentsForPatients(@Param('userId') userId: string) {
  //   return this.userService.getAppointsForpatients(userId);
  // }

  // @Post('addReview')
  // async addReview(
  //   @Body() dto: { doctorProfileId: string; userId: string; comment: string },
  // ) {
  //   console.log(dto);
  //   return this.userService.addReview(dto);
  // }

  // @Get("getPopularDoctors")
  // async getPopularDoctors(){
  //   return this.userService.getPopularDoctors();
  // }
}
