import { Controller, Get, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('getUnverifiedDoctors')
  async getUnverifiedDoctors() {
    return this.adminService.getUnVerifiedDoctors();
  }

  @Get('getAppointments')
  async getAppointments() {
    return this.adminService.getAppointments();
  }

  @Get('actionOnDoctor')
  async actionOnUser(
    @Query('userId') userId: string,
    @Query('action') action: string,
  ) {
    // console.log(action, userId);
    return this.adminService.actionOnDoctor(userId, action);
  }
}
