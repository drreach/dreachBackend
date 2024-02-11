import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  UpdateDoctorDetailsDto,
  UpdateUserDetailsDto,
  createUserDto,
} from './dto/user.dto';
import { PrismaService } from 'src/prisma.service';

import { hash } from 'bcrypt';
import { NotFoundError } from 'rxjs';

import { v4 as uuidv4 } from 'uuid';
import { UtilsService } from 'src/utils/utils.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utils: UtilsService,
  ) {}

  async createUser(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
      include: {
        doctorProfile: {
          select: {
            id: true,
            specializations: true,
            description: true,
            fee: true,
          },
        },
      },
    });

    if (user) return user;
    const newUser = await this.prisma.user.create({
      data: {
        email: email,
        role: 'NORMAL',
        userId: `PT-${this.utils.generateRandomString(5)}`,
        username: email.split('@')[0],
      },
    });

    if (!newUser)
      throw new InternalServerErrorException('Something went wrong');
    return newUser;
  }

  async updateUsersProfile(doctorProfile: UpdateUserDetailsDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: doctorProfile.userId,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const updatedUser = await this.prisma.user.update({
      where: {
        id: doctorProfile.userId,
      },
      data: {
        Fname: doctorProfile.Fname,
        Lname: doctorProfile.Lname,

        dob: doctorProfile.dob,
        bloodGroup: doctorProfile.bloodGroup as any,
        address: doctorProfile.Address,
        contact: doctorProfile.contact,
      },
    });

    if (!updatedUser)
      throw new InternalServerErrorException('Something went wrong');

    return updatedUser;
  }

  async createDoctorProfile(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) throw new NotFoundException('User not found');

      const doctorProfile = await this.prisma.doctorProfile.create({
        data: {
          user: {
            connect: {
              id: userId,
            },
          },
        },
      });

      if (!doctorProfile)
        throw new InternalServerErrorException('Something went wrong');

      return doctorProfile;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // console.log(error);
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async updatePatientsProfile(patients: UpdateUserDetailsDto) {
    try {
      const {
        userId,
        Fname,
        Lname,
        dob,
        bloodGroup,
        Address,
        contact,
        ...res
      } = patients;

      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) throw new NotFoundException('User not found');

      const updatedUser = await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          Fname: patients.Fname,
          Lname: patients.Lname,
          dob: patients.dob,
          bloodGroup: patients.bloodGroup as any,
          address: patients.Address,
          contact: patients.contact,
          gender: patients.gender as any,
        },
      });

      if (!updatedUser)
        throw new InternalServerErrorException('Something went wrong');

      return updatedUser;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async updateDoctorsProfileDetails(doctorProfile: UpdateDoctorDetailsDto) {
    const {
      doctorProfileId,
      Fname,
      Lname,
      age,
      dob,
      bloodGroup,
      address,
      contact,
      ...res
    } = doctorProfile;

    const user = await this.prisma.user.findUnique({
      where: {
        id: doctorProfile.userId,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    console.log(user);

    const updateUserProfile = await this.prisma.user.update({
      where: {
        id: doctorProfile.userId,
      },
      data: {
        Fname: Fname,
        Lname: Lname,
        dob: dob,
        bloodGroup: bloodGroup as any,
        address: address,
        contact: contact,
        gender: doctorProfile.gender as any,

      },
    });

    const updatedUser = await this.prisma.doctorProfile.update({
      where: {
        id: doctorProfileId,
      },
      data: {
        ...res,
      },
      include: {
        user: true,
      },
    });

    if (!updatedUser)
      throw new InternalServerErrorException('Something went wrong');

    return updatedUser;
  }

  async getUserById(userId: string) {
    try {
      return await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          doctorProfile: {
            select: {
              specializations: true,
            },
          },
        },
      });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

  async getDoctorById(userId: string) {
    try {
      const doctor = await this.prisma.doctorProfile.findUnique({
        where: {
          userId: userId,
        },
        include: {
          user: true,
        },
      });

      if (!doctor) throw new NotFoundException('User not found');
      return doctor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

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
          user: {
            select: {
              Fname: true,
              Lname: true,
              email: true,
              gender: true,
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

  async getApprovedDoctors() {
    try {
      return await this.prisma.doctorProfile.findMany({
        where: {
          status: 'APPROVED',
        },
        select: {
          id: true,
          createdAt: true,
          status: true,
          user: {
            select: {
              Fname: true,
              Lname: true,
              email: true,
              isActive: true,
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

  async actionOnDoctor(userId: string, action: string) {
    try {
      const doctor = await this.prisma.doctorProfile.findUnique({
        where: {
          id: userId,
        },
      });

      if (!doctor) throw new NotFoundException('Doctor not found');

      // const updatedDoctor = await this.prisma.doctorProfile.update({
      //   where:{
      //     id:userId
      //   },
      //   data:{
      //     status:action as "ACCEPTED" | "REJECTED",

      //   }
      // });

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

  async getPatients() {
    try {
      return await this.prisma.user.findMany({
        where: {
          role: 'NORMAL',
          isActive: true,
        },
        select: {
          Fname: true,
          Lname: true,
          email: true,
          contact: true,
          dob: true,
          userId: true,
          address: true,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

  async findDoctorsList() {
    try {
      return await this.prisma.doctorProfile.findMany({
        where: {
          status: 'APPROVED',
        },
        select: {
          id: true,
          specializations: true,
          fee: true,
          user: {
            select: {
              Fname: true,
              Lname: true,
              email: true,  
              contact: true,
              address: true,
              username:true
            },
          },
        },
      });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

  async getDoctroByUsername(username: string) {
    try {
      const  p = await this.prisma.user.findUnique({
        where: {
          username: username,
          role: 'DOCTOR',
        }, 
        include: {
          doctorProfile: true,
        }, 
      });

      console.log(p);
      return p;
    } catch (error) {
      console.log(error)
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }



  // doctorName: "Dr. Ruby Perrin",
  //     doctorImage: "/assets/doctor-1.jpg",
  //     AppointmentDate: "14 Nov 2019",
  //     BookedDate: "12 Nov 2019",
  //     Amount: "$160",
  //     status: "Confirmed",
  //     specialization: "MBBS",


  async getAppointsForpatients(userId: string) {
    try {
      return await this.prisma.appointment.findMany({
        where: {
          userId: userId,
        },
        select:{
         doctorProfile:{
            select:{
              user:{
                select:{
                  Fname:true,
                  Lname:true,
                  profilePic:true,
                  
                 
                  
                }
              },
              specializations:true,
              fee:true,

            
              }
            },
            appointmentSlotDate:true,
            appointmentSlotTime:true,
            createdAt:true,
            isForOthers:true,
            status:true,
         
        }
      });
    } catch (error) {
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }


  async addReview(dto:{doctorProfileId:string,userId:string,comment:string}){
    try {
      const review = await this.prisma.rating.create({
        data:{
          comment:dto.comment,
          doctorProfile:{
            connect:{
              id:dto.doctorProfileId
            }
          },
          User:{
            connect:{
              id:dto.userId
            }
          }
        },

      });

      if(!review) throw new InternalServerErrorException('Internal Server Error!');
      return review;
    } catch (error) {
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

 
}
