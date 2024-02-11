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
import { UpdateDoctorDetailsDto, UpdateUserDetailsDto } from './dto/user.dto';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('signup')
  async signup(@Body('email') email: string) {
    return await this.userService.createUser(email);
  }

  //   @Post('updateUser')
  //   async updateUser(@Body() doctorProfile: UpdateUserDetailsDto) {
  //     console.log(doctorProfile);

  //     return await this.userService.updateDoctorsProfile(doctorProfile);
  //   }

  @Post('createDoctorProfile')
  async createDoctorProfile(@Body('userId') userId: string) {
    return await this.userService.createDoctorProfile(userId);
  }

  @Post('updateDoctorProfile')
  async updateDoctorProfile(@Body() doctorProfile: UpdateDoctorDetailsDto) {
    console.log(doctorProfile);
    return await this.userService.updateDoctorsProfileDetails(doctorProfile);
  }

  @Post('updateUser')
  async updateUser(@Body() dto: UpdateUserDetailsDto) {
    console.log(dto);
    return this.userService.updatePatientsProfile(dto);
  }

  @Get('getuser/:userId')
  async getUserById(@Param('userId') userId: string) {
    return this.userService.getUserById(userId);
  }

  @Get('getDoctor/:userId')
  async getDoctorById(@Param('userId') userId: string) {
    return this.userService.getDoctorById(userId);
  }

  @Get('getUnverifiedDoctors')
  async getUnverifiedDoctors() {
    return this.userService.getUnVerifiedDoctors();
  }

  @Get('getAppointments')
  async getAppointments() {
    return this.userService.getAppointments();
  }

  @Get('getApprovedDoctors')
  async getApprovedDoctors() {
    return this.userService.getApprovedDoctors();
  }

  @Get('actionOnUser')
  async actionOnUser(
    @Query('userId') userId: string,
    @Query('action') action: string,
  ) {
    console.log(action, userId);
    return this.userService.actionOnDoctor(userId, action);
  }

  @Get('getPatients')
  async getPatients() {
    return this.userService.getPatients();
  }

  @Get('findDoctorList')
  async findDoctorList() {
    return this.userService.findDoctorsList();
  }

  @Get('getDoctorProfile/:username')
  async getDoctorProfile(@Param('username') username: string) {
    console.log(username)
    return this.userService.getDoctroByUsername(username);
  }

  @Get('getAppointments/:userId')
  async getAppointmentsForPatients(@Param('userId') userId: string) {
    return this.userService.getAppointsForpatients(userId);
  }


  @Post("addReview")
  async addReview(@Body() dto:{doctorProfileId:string,userId:string,comment:string}){
    console.log(dto);
    return this.userService.addReview(dto);  
  }
  
}
   