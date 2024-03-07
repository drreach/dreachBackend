import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JWTGuard } from 'src/auth/guard/jtw.guard';
import { UpdateUserDetailsDto } from './dto/user.dto';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  //creating new User
  @Post('signup')
  async signup(@Body('email') email: string) {
    return await this.userService.createUser(email);
  }

  //creating doctor profile if user wants to apply for doctor
  @Post('createDoctorProfile')
  async createDoctorProfile(@Body('userId') userId: string) {
    return await this.userService.createDoctorProfile(userId);
  }

  //updating the existing user
  @Post('updateUser')
  async updateUser(@Body() dto: UpdateUserDetailsDto) {
    console.log(dto);
    return this.userService.updatePatientsProfile(dto);
  }

  //getting the user profile using user Id
  @Get('getuser/:userId')
  async getUserById(@Param('userId') userId: string) {
    return this.userService.getUserById(userId);
  }

  //
  @Get('getApprovedDoctors')
  async getApprovedDoctors() {
    return this.userService.getApprovedDoctors();
  }

  @Get('getPatients')
  async getPatients() {
    return this.userService.getPatients();
  }

  @Get('findDoctorList')
  async findDoctorList(@Query() dto: { speciality: string; address: string }) {
    console.log(dto);
    return this.userService.findDoctorsList(dto);
  }

  @Get('findDoctorbyHomeVisit')
  async findDoctorbyHomeVisit() {
    return this.userService.findDoctorByHomeVisit();
  }

  @Get('findDoctorbyVideoConsultation')
  async findDoctorByVideoConsultation(
    @Query() dto: { date: string; slot: string },
  ) {
    console.log(dto);
    return this.userService.findDoctorByVideoConsultation(dto);
  }

  @Get('getDoctorProfile/:username')
  async getDoctorProfile(@Param('username') username: string) {
    console.log(username);
    return this.userService.getDoctroByUsername(username);
  }

  @Get('getAppointments/:userId')
  async getAppointmentsForPatients(@Param('userId') userId: string) {
    return this.userService.getAppointsForpatients(userId);
  }

  @Post('addReview')
  async addReview(
    @Body() dto: { doctorProfileId: string; userId: string; comment: string },
  ) {
    console.log(dto);
    return this.userService.addReview(dto);
  }
}
