import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getUnVerifiedDoctors() {
    try {
      const DoctorList = await this.prisma.user.count({
        where: {
          role: 'DOCTOR',
        },
      });

      const patientsList = await this.prisma.user.count({
        where: {
          role: 'NORMAL',
        },
      });

      const doctors = await this.prisma.doctorProfile.findMany({
        where: {
          status: 'PENDING',
        },

        select: {
          id: true,
          createdAt: true,
          document: true,
          user: {
            select: {
              Fname: true,
              Lname: true,
              email: true,
              gender: true,
              profilePic: true,
              username: true,
            },
          },
        },
      });

      return {
        doctors,
        DoctorList,
        patientsList,
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

  async getAppointments() {
    try {
      return await this.prisma.appointment.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

  //approve or Reject the doctors for verification
  async actionOnDoctor(userId: string, action: string) {
    try {
      const doctor = await this.prisma.doctorProfile.findUnique({
        where: {
          id: userId,
        },
      });

      if (!doctor) throw new NotFoundException('Doctor not found');

      const t = await this.prisma.$transaction([
        this.prisma.doctorProfile.update({
          where: {
            id: userId,
          },
          data: {
            status: action as 'APPROVED' | 'REJECTED',
          },
        }),
        this.prisma.user.update({
          where: {
            id: doctor.userId,
          },
          data: {
            // isActive:action==="ACCEPTED"?true:false
            role: action === 'APPROVED' ? 'DOCTOR' : 'NORMAL',
          },
        }),
      ]);

      if (!t) throw new InternalServerErrorException('Internal Server Error!');

      return t;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Internal Server Error');
    }
  }
}
