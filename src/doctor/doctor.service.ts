import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { StorageService } from 'src/storage/storage.service';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as sharp from 'sharp';
import { UpdateSheduleDto, bookAppointmentDTO } from 'src/user/dto/user.dto';
import { ExceptionMessages } from '@google-cloud/storage/build/cjs/src/storage';

import { format, formatISO } from 'date-fns';

@Injectable()
export class DoctorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async updatShedule(dto: UpdateSheduleDto) {
    try {
      const shedule = await this.prisma.shedule.findUnique({
        where: {
          doctorProfileId: dto.doctorProfileId,
        },
      });

      if (shedule) {
        const update = await this.prisma.shedule.update({
          where: {
            doctorProfileId: dto.doctorProfileId,
          },
          data: {
            DeskShedule: dto.shedule?.DeskShedule,
            OnlineShedule: dto.shedule?.OnlineShedule,
          },
        });

        console.log('updated', update);

        return update;
      } else {
        const create = await this.prisma.shedule.create({
          data: {
            doctorProfileId: dto.doctorProfileId,
            DeskShedule: dto.shedule?.DeskShedule,
            OnlineShedule: dto.shedule?.OnlineShedule,
          },
        });

        console.log(create);
        return create;
      }
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async getSheudle(userId: string) {
    try {
      const doctor = await this.prisma.doctorProfile.findUnique({
        where: {
          id: userId,
        },
      });

      const shedule = await this.prisma.shedule.findUnique({
        where: {
          doctorProfileId: userId,
        },

        include: {
          doctorProfile: {
            select: {
              isAvailableForDesk: true,
              mode: true,
              schedules:true
            },
          },
        },
      });
      console.log(shedule);
      return shedule??{
        doctorProfile:{
          isAvailableForDesk:doctor?.isAvailableForDesk,
          mode:doctor?.mode,
          schedules:{
            DeskShedule:[],
            OnlineShedule:[]
          }
        }
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async getDoctorProfile(username: string) {
    try {
      const doctor = await this.prisma.user.findUnique({
        where: {
          username: username,
          role: 'DOCTOR',
        },
      });
      return doctor;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async sheduleThings(username: string,userId?:string|undefined) {
    const today = new Date().toISOString().split('T')[0];

    console.log(typeof(userId))
    try {
      const startDate = new Date();
      const numDays = 10;

      const slotDetails = [];
      const doctor = await this.prisma.user.findUnique({
        where: {
          username: username,
        },
        include: {
          doctorProfile: {
            include: {
              schedules: true,
            },
          },
        },
      });
      if (!doctor) throw new UnauthorizedException('Unauthorized Access');

      for (let i = 0; i < numDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateOnly = format(currentDate, 'yyyy-MM-dd');
        const isoDate = formatISO(dateOnly);
        console.log(isoDate);
        const appointments = await this.prisma.appointment.findMany({
          where: {
            doctorProfileId: doctor.doctorProfile.id,
            appointmentSlotDate: isoDate,
          },
          select: {
            appointmentSlotTime: true,
          },
        });

        const bookedSlots = appointments.map(
          (appointment) => appointment.appointmentSlotTime,
        );

        const currentTime = new Date();
        const currentHours = currentTime.getHours();
        const currentMinutes = currentTime.getMinutes();

        const availableSlots =
          doctor.doctorProfile.schedules?.OnlineShedule.filter(
            (slot) => {
              const slotHours = parseInt(slot.split(':')[0]);
              const slotMinutes = parseInt(slot.split(':')[1]);
              if (
                (currentDate.getDate() === startDate.getDate() &&
                slotHours < currentHours) || bookedSlots.includes(slot)
              ) {
                return false;
              }
              if (
                currentDate.getDate() === startDate.getDate() &&
                (slotHours === currentHours &&
                slotMinutes < currentMinutes) || bookedSlots.includes(slot)
              ) {
                return false;
              }
              return true;
            }
          );
          const sortAvailableSlots = availableSlots?  availableSlots.sort((a, b) => {
            const aHours = parseInt(a.split(':')[0]);
            const bHours = parseInt(b.split(':')[0]);
            if (aHours < bHours) {
              return -1;
            }
            if (aHours > bHours) {
              return 1;
            }
            return 0;
          }
          ):[]



        slotDetails.push({
          date: isoDate,
          availableSlots: sortAvailableSlots,
          bookedSlots: bookedSlots,
        });
      }

      let bookedByCurrentUser;
      if(userId!=="undefined"){
        bookedByCurrentUser = await this.prisma.appointment.findFirst({
          where: {
            doctorProfileId: doctor.doctorProfile.id,
            userId: userId,
            appointmentSlotDate: {
              gte: formatISO(today),
            },
          },
        });

        console.log(bookedByCurrentUser)
      }

      const isDoctorAppointedEver = await this.prisma.appointment.findFirst({
        where:{
          doctorProfileId:doctor.doctorProfile.id,
          status:"APPROVED"
        }
      });
     
      return {
        slotDetails,
        doctor,
        isBookedByCurrentUser: bookedByCurrentUser ? true : false,
        status: bookedByCurrentUser?.status,
        isDoctorAppointedEver:isDoctorAppointedEver?true:false
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async checkDoctorAvailability(doctorId: string, date: string, slot: string) {
    try {
      console.log(date);

      const appointments = await this.prisma.appointment.findMany({
        where: {
          doctorProfileId: doctorId,
          appointmentSlotDate: formatISO(date),
        },
        select: {
          appointmentSlotTime: true,
        },
      });

      const bookedSlots = appointments.map(
        (appointment) => appointment.appointmentSlotTime,
      );

      const doctor = await this.prisma.doctorProfile.findUnique({
        where: {
          id: doctorId,
        },
        select: {
          schedules: true,
          fee: true,
          mode: true,
          id: true,
          user: {
            select: {
              Fname: true,
              Lname: true,
              address: true,
              profilePic: true,
            },
          },
        },
      });

      const availableSlots = doctor.schedules.OnlineShedule.filter(
        (s) => !bookedSlots.includes(s),
      );

      return {
        doctor: doctor,
        isAvailable: availableSlots.includes(slot),
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async checkDoctorAvailableShedule(
    doctorId: string,
    date: Date,
    slot: string,
  ) {
    try {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          doctorProfileId: doctorId,
          appointmentSlotDate: date,
        },
        select: {
          appointmentSlotTime: true,
        },
      });

      const bookedSlots = appointments.map(
        (appointment) => appointment.appointmentSlotTime,
      );

      const doctor = await this.prisma.doctorProfile.findUnique({
        where: {
          id: doctorId,
        },
        select: {
          schedules: true,
          fee: true,
          mode: true,
          user: {
            select: {
              Fname: true,
              Lname: true,
              address: true,
              profilePic: true,
            },
          },
        },
      });

      const availableSlots = doctor.schedules.OnlineShedule.filter(
        (s) => !bookedSlots.includes(s),
      );

      return availableSlots.includes(slot);
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async uploadDoctorProfile(userId: string, file?: Express.Multer.File) {
    try {
      if (file) {
        const user = await this.prisma.user.findUnique({
          where: {
            id: userId,
          },
        });
        if (!user) throw new UnauthorizedException('Unauthorized Access');

        const profileId = user.profilePic;
        if (profileId) {
          await this.storageService.delete('doctorProfile/' + profileId);
        }
        const mediaId = await this.generateMediaId();
        const filebuffer = await sharp(file.buffer)
          .webp({ quality: 80 }) // Adjust quality as needed
          .toBuffer();
        const p = await this.storageService.save(
          'doctorProfile/' + mediaId,
          'image/webp', // Set the mimetype for WebP
          filebuffer,
          [{ mediaId: mediaId }],
        );
        const update = await this.prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            profilePic: p.mediaId,
          },
        });
        return update.profilePic ?? null;
      }
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async generateMediaId() {
    return await this.storageService.generateMediaId();
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  // async findDoctorBySundaySchedule(startTime:string, endTime:string, mode:string) {

  //   const

  //   // Convert the start and end times to a numerical representation for comparison
  //   const startMinutes = this.convertTimeToMinutes(startTime);
  //   const endMinutes = this.convertTimeToMinutes(endTime);

  //   // Iterate through the schedule for Sunday
  //   for (const schedule of schedules.sun) {
  //     const scheduleStartMinutes = this.convertTimeToMinutes(schedule.start);
  //     const scheduleEndMinutes = this.convertTimeToMinutes(schedule.end);

  //     // Check if the given time range and mode match the schedule
  //     if (
  //       schedule.mode === mode &&
  //       ((startMinutes >= scheduleStartMinutes && startMinutes < scheduleEndMinutes) ||
  //       (endMinutes > scheduleStartMinutes && endMinutes <= scheduleEndMinutes))
  //     ) {
  //       return true; // Doctor with matching schedule found
  //     }
  //   }

  //   return false; // No doctor found with matching schedule on Sunday
  // }

  // // async  findDoctorsBySchedule(startTime, endTime, mode) {
  // //   const fri = "fri";
  // //   const doctors = await this.prisma.doctorProfile.findMany({
  // //     where: {

  // //      AND:[
  // //       {
  // //         schedules:{
  // //           some:{
  // //             mode:"ONLINE",
  // //           end:{
  // //             lt:" "
  // //           }
  // //           }
  // //         }
  // //       }
  // //      ]

  // //     }
  // //   });

  //   return doctors;
  // }

  convertTimeToMinutes(time) {
    // Split the time into hours, minutes, and am/pm
    const [hourStr, minuteStr] = time.split(':');
    let hour = parseInt(hourStr, 10);
    let minute = parseInt(minuteStr, 10);

    // Adjust the hour for PM times
    if (time.toLowerCase().includes('pm') && hour !== 12) {
      hour += 12;
    }

    // Calculate the total minutes past midnight
    const totalMinutes = hour * 60 + minute;
    return totalMinutes;
  }

  async bookAppointment(dto: bookAppointmentDTO) {
    try {
      const checkAvailabilty = await this.checkDoctorAvailableShedule(
        dto.doctorProfileId,
        new Date(dto.appointmentSlotDate),
        dto.appointmentSlotTime,
      );
      if (!checkAvailabilty) {
        console.log('here');
        throw new BadRequestException('Slot not available');
      }

      const appointment = await this.prisma.appointment.create({
        data: {
          doctorProfileId: dto.doctorProfileId,
          userId: dto.userId,
          appointmentSlotDate: formatISO(dto.appointmentSlotDate),
          appointmentSlotTime: dto.appointmentSlotTime,
          type: dto.type,
          CurrentLocation: dto.currentLocation,
          status: 'PENDING',
        },
      });

      console.log(appointment);

      return appointment;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }


  async doctorDashboardInfo(doctorProfileId:string){
    console.log(doctorProfileId);
    if(!doctorProfileId){
      throw new BadRequestException('Invalid doctorProfileId');
    }
    try {
      const totalAppointments = await this.prisma.appointment.count({
        where:{
          doctorProfileId:doctorProfileId
        }
      });

      const totalPendingAppointments = await this.prisma.appointment.count({
        where:{
          doctorProfileId:doctorProfileId,
          status:"PENDING"
        }
      });

      const totalApprovedAppointments = await this.prisma.appointment.count({
        where:{
          doctorProfileId:doctorProfileId,
          status:"APPROVED"
        }
      });

      const totalRejectedAppointments = await this.prisma.appointment.count({
        where:{
          doctorProfileId:doctorProfileId,
          status:"REJECTED"
        }
      });

      //getToday date 
      const today = new Date().toISOString().split('T')[0];


      // const todayAppointments = await this.prisma.appointment.count({
      //   where:{
      //     doctorProfileId:doctorProfileId,
      //     appointmentSlotDate:formatISO(today)
      //   }
      // });


      const todayAppointMentdDetails = await this.prisma.appointment.findMany({
        where:{
          doctorProfileId:doctorProfileId,
          appointmentSlotDate:formatISO(today),
        },

        select:{
          user:{
            select:{
              Fname:true,
              Lname:true,
              contact:true,
              profilePic:true,
              userId:true
            },
            
          },
          isForOthers:true,
          othersContact:true,
          appointmentSlotTime:true,
          id:true,
          status:true,
          doctorProfileId:true,
          userId:true

        }
      });

      const upcomingAppointsMents = await this.prisma.appointment.findMany({
        where:{
          doctorProfileId:doctorProfileId,
          appointmentSlotDate:{
            gt:formatISO(new Date())
          },

        
        },



        select:{
          user:{
            select:{
              Fname:true,
              Lname:true,
              contact:true,
              profilePic:true
            },
            
          },
          isForOthers:true,
          othersContact:true,
          appointmentSlotTime:true,
          appointmentSlotDate:true,
          id:true,
          doctorProfileId:true,
          status:true,
          userId:true

        }
      })

      return {
        totalAppointments,
        totalPendingAppointments,
        totalApprovedAppointments,
        totalRejectedAppointments,
        totalTodayAppointments:todayAppointMentdDetails.length,
        todayAppointMentdDetails,
        upcomingAppointsMents
      }

    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
      
    }
  }


  // Fname:"Ranjit",
  // Lname:"Das",
  // address:{
  //     address:"BBSR",
  //     city:"BBSR",
  //     country:"India",
  //     pincode:"751024",
  //     state:"Odisha"
  // },
  // bloodGroup:"O+",
  // contact:"9631627104",
  // dob:"2000-07-17",
  // email:"21053420@kiit.ac.in",
  // profilePic:"/assets/doctor-2.jpg",
  // userId:"#PT_0112"

  async getPatients(doctorProfileId:string){
    try {
      const patients = await this.prisma.appointment.findMany({
        where:{
          doctorProfileId:doctorProfileId,
          status:"APPROVED"
        },
        select:{
          user:{
            select:{
              Fname:true,
              Lname:true,
              address:true,
              bloodGroup:true,
              contact:true,
              dob:true,
              email:true,
              profilePic:true,
              userId:true
            }
          }
        }
      });
      // filter duplicate patients
      const removeDuplicates = patients.filter((patient,index,self)=>{
        const index_ = self.findIndex((t)=>t.user.userId === patient.user.userId);
        return index === index_;
      }
      );

      return removeDuplicates;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }


  async actionOnPatients(dto:{doctorProfileId,userId:string,action:string,apptId:string}){
    console.log(dto)
    try {
      const update = await this.prisma.appointment.update({
        where:{
          id:dto.apptId,
          doctorProfileId:dto.doctorProfileId
        },
        data:{
          status:dto.action
        }
      });

      return update;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }
}
