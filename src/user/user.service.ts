import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UpdateUserDetailsDto, createUserDto } from './dto/user.dto';
import { PrismaService } from 'src/prisma.service';

import { hash } from 'bcrypt';
import { NotFoundError } from 'rxjs';

import { v4 as uuidv4 } from 'uuid';
import { UtilsService } from 'src/utils/utils.service';
import { formatISO } from 'date-fns';
import { StorageService } from 'src/storage/storage.service';
import * as sharp from 'sharp';

import * as fs from 'fs';
import { Readable } from 'stream';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utils: UtilsService,
    private readonly storageService: StorageService,
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
        // address: doctorProfile.Address,
        contact: doctorProfile.contact,
      },
    });

    if (!updatedUser)
      throw new InternalServerErrorException('Something went wrong');

    return updatedUser;
  }

  async generateMediaId() {
    return await this.storageService.generateMediaId();
  }


  async uploadDoctorProfile(dto: UpdateUserDetailsDto, file?: Express.Multer.File,) {
    try {
      const {userId,...res}=dto;
      if (file) {
        const user = await this.prisma.user.findUnique({
          where: {
            id:userId,
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
            ...res

          },
        });
        return update.profilePic ?? null;
      }
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
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

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async updatePatientsProfile(patients: UpdateUserDetailsDto, file?: Express.Multer.File) {
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

      if (file) {
        const u = await this.prisma.user.findUnique({
          where: {
            id:userId,
          },
        });
        if (!u) throw new UnauthorizedException('Unauthorized Access');

        const profileId = u.profilePic;
        if (profileId) {
          await this.storageService.delete('doctorProfile/' + profileId);
        }
        const mediaId = await this.generateMediaId();
        const buffer = await fs.createReadStream(file.path); 

        const fb = await this.streamToBuffer(buffer);

        const filebuffer = await sharp(fb)
          .webp({ quality: 80 }) // Adjust quality as needed
          .toBuffer();
        const p = await this.storageService.save(
          'doctorProfile/' + mediaId,
          'image/webp', // Set the mimetype for WebP
          filebuffer,
          [{ mediaId: mediaId }],
        );

        if(p){
           fs.unlinkSync(file.path);
        }

        return  await this.prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            Fname: Fname,
            Lname: Lname,
            dob: dob,
            bloodGroup: bloodGroup as any,
            address:Address as any,
            gender: patients.gender ,
            contact: contact,
            profilePic: p.mediaId,
            ...res
          },
        });

      }

      const updatedUser = await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {

          Fname: patients.Fname,
          Lname: patients.Lname,
          dob: patients.dob,
          bloodGroup: patients.bloodGroup as any,
          address:patients.Address as any,
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
              profilePic: true,
              username: true,
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Internal Server Error!');
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
          profilePic: true,
          dob: true,
          userId: true,
          address: true,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

  async findDoctorsList(dto: { speciality: string; address: string,mode:string }) {

    const whereClause={
      Status: 'APPROVED',
      mode:{}
    }
    try {
      const doctor = await this.prisma.doctorProfile.findMany({
        where: {
          status: 'APPROVED',
          mode:dto.mode==="NONE"?{}:dto.mode==="CLINIC_VISIT"?"VIDEO_CONSULT":dto.mode
        },
        select: {
          id: true,
          specializations: true,
          fee: true,
          mode: true,
          isAvailableForDesk: true,
          user: {
            select: {
              Fname: true,
              Lname: true,
              email: true,
              contact: true,
              address: true,
              profilePic: true,
              username: true,
            },
          },
        },
      });

      // Filter doctors based on speciality and address
      const filteredDoctor = doctor.filter((d) => {
        if (dto.speciality === 'NONE' && dto.address === 'NONE') return true;

        if (dto.speciality !== 'NONE') {
          if (!d.specializations.includes(dto.speciality)) {
            return false;
          }

          if (dto.address === 'NONE') {
            return true;
          }

          const userAddress = d.user.address;
          if (
            userAddress.address
              .toLowerCase()
              .includes(dto.address.toLowerCase()) ||
            userAddress.city
              .toLowerCase()
              .includes(dto.address.toLowerCase()) ||
            userAddress.state
              .toLowerCase()
              .includes(dto.address.toLowerCase()) ||
            userAddress.country
              .toLowerCase()
              .includes(dto.address.toLowerCase()) ||
            userAddress.pincode
              .toLowerCase()
              .includes(dto.address.toLowerCase())
          ) {
            return true;
          }
        } else {
          const userAddress = d.user.address;
          if (
            userAddress.address
              .toLowerCase()
              .includes(dto.address.toLowerCase()) ||
            userAddress.city
              .toLowerCase()
              .includes(dto.address.toLowerCase()) ||
            userAddress.state
              .toLowerCase()
              .includes(dto.address.toLowerCase()) ||
            userAddress.country
              .toLowerCase()
              .includes(dto.address.toLowerCase()) ||
            userAddress.pincode
              .toLowerCase()
              .includes(dto.address.toLowerCase())
          ) {
            return true;
          }
        }
      });

      return dto.mode==="CLINIC_VISIT"?filteredDoctor.filter((d)=>d.isAvailableForDesk):filteredDoctor;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

  async findDoctorByHomeVisit() {
    try {
      const doctor = await this.prisma.doctorProfile.findMany({
        where: {
          mode: 'HOME_VISIT',
        },
        select: {
          id: true,
          specializations: true,
          fee: true,
          mode: true,
          isAvailableForDesk: true,
          user: {
            select: {
              Fname: true,
              Lname: true,
              email: true,
              contact: true,
              address: true,
              profilePic: true,
              username: true,
            },
          },
        },
      });

      return doctor;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

  getLocalTimezone() {
    const currentDateInServerTimeZone = new Date();

    const istOffsetMilliseconds = 5.5 * 60 * 60 * 1000;
    const s = new Date(
      currentDateInServerTimeZone.getTime() + istOffsetMilliseconds,
    );
    return s;
  }

  async getSlotsByVideoConsult(
    username: string,
    userId?: string | undefined,
    date?: string,
    slots?: string,
  ) {
    try {
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
      console.log(date);
      const currentDate = new Date(date);
      const isoDate = formatISO(date);

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
      console.log(doctor.doctorProfile.schedules.OnlineShedule);

      const givenSlotHr = slots.split(':')[0];
      const givenSlotMin = slots.split(':')[1];

      const totalslotTime =
        parseInt(givenSlotHr) * 60 + parseInt(givenSlotMin) + 30;

      const currentTime = this.getLocalTimezone();
      const currentDt = currentTime.getDate();
      const availableSlots =
        doctor.doctorProfile.schedules.OnlineShedule.filter((slot) => {
          console.log('slots is ', slot);
          const sltTotalmin =
            parseInt(slot.split(':')[0]) * 60 + parseInt(slot.split(':')[1]);
          console.log(
            slot,
            currentDate.getDate(),
            currentDt,
            totalslotTime,
            sltTotalmin,
            slots,
          );
          if (
            currentDate.getDate() < currentDt ||
            (currentDate.getDate() === currentDt &&
              totalslotTime > sltTotalmin) ||
            bookedSlots.includes(slot)
          ) {
            return false;
          }
          if (
            (currentDate.getDate() > currentDt &&
              totalslotTime > sltTotalmin) ||
            bookedSlots.includes(slot) ||
            sltTotalmin > totalslotTime + 30
          ) {
            return false;
          }
          return true;
        });
      return availableSlots.length;
    } catch (error) {
      console.log(error);
    }
  }

  async findDoctorByVideoConsultation(dto: { date: string; slot: string }) {
    try {
      const doctors = await this.prisma.doctorProfile.findMany({
        where: {
          mode: 'VIDEO_CONSULT',
          status: 'APPROVED',
        },
        select: {
          id: true,
          specializations: true,
          fee: true,
          mode: true,
          isAvailableForDesk: true,
          schedules: true,
          appointments: true,
          user: {
            select: {
              Fname: true,
              Lname: true,
              email: true,
              contact: true,
              address: true,
              profilePic: true,
              username: true,
            },
          },
        },
      });

      const currentDate = new Date(dto.date);
      const currentTime = this.getLocalTimezone();
      const currentDt = currentTime.getDate();
      const givenSlotHr = dto.slot.split(':')[0];
      const givenSlotMin = dto.slot.split(':')[1];

      const totalslotTime =
        parseInt(givenSlotHr) * 60 + parseInt(givenSlotMin) + 30;

      const availableDoctors = await Promise.all(
        doctors.map(async (doctor) => {
          const appointments = await this.prisma.appointment.findMany({
            where: {
              doctorProfileId: doctor.id,
              appointmentSlotDate: formatISO(dto.date),
              type: 'VIDEO_CONSULT',
            },
            select: {
              appointmentSlotTime: true,
            },
          });

          const bookedSlots = appointments.map(
            (appointment) => appointment.appointmentSlotTime,
          );

          const availableSlots = doctor?.schedules?.OnlineShedule?.filter(
            (slot) => {
              console.log('slots is ', slot);
              const sltTotalmin =
                parseInt(slot.split(':')[0]) * 60 +
                parseInt(slot.split(':')[1]);
              console.log(
                slot,
                currentDate.getDate(),
                currentDt,
                totalslotTime,
                sltTotalmin,
                dto.slot,
              );
              if (
                currentDate.getDate() < currentDt ||
                (currentDate.getDate() === currentDt &&
                  totalslotTime > sltTotalmin) ||
                bookedSlots.includes(slot)
              ) {
                return false;
              }
              if (
                (currentDate.getDate() > currentDt &&
                  totalslotTime > sltTotalmin) ||
                bookedSlots.includes(slot) ||
                sltTotalmin > totalslotTime + 30
              ) {
                return false;
              }
              return true;
            },
          );

          console.log('available', availableSlots);

          return availableSlots?.length > 0
            ? { ...doctor, availableSlots: availableSlots }
            : null;
        }),
      );

      const filteredDoctors = availableDoctors.filter(
        (doctor) => doctor !== null,
      );

      return filteredDoctors;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

  async getDoctroByUsername(username: string) {
    try {
      const p = await this.prisma.user.findUnique({
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
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

  async getAppointsForpatients(userId: string) {
    try {
      return await this.prisma.appointment.findMany({
        where: {
          userId: userId,
        },
        select: {
          doctorProfile: {
            select: {
              user: {
                select: {
                  Fname: true,
                  Lname: true,
                  profilePic: true,
                  username: true,
                },
              },
              specializations: true,
              fee: true,
            },
          },
          appointmentSlotDate: true,
          appointmentSlotTime: true,
          createdAt: true,

          isForOthers: true,
          status: true,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }

  async addReview(dto: {
    doctorProfileId: string;
    userId: string;
    comment: string;
  }) {
    try {
      const review = await this.prisma.rating.create({
        data: {
          comment: dto.comment,
          doctorProfile: {
            connect: {
              id: dto.doctorProfileId,
            },
          },
          User: {
            connect: {
              id: dto.userId,
            },
          },
        },
      });

      if (!review)
        throw new InternalServerErrorException('Internal Server Error!');
      return review;
    } catch (error) {
      throw new InternalServerErrorException('Internal Server Error!');
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

  async getPopularDoctors() {
    try {
      const doctorsWithAppointments = await this.prisma.doctorProfile.findMany({
        where: {
          status: 'APPROVED',
        },
        include: {
          appointments: true,
          user:true // Include appointments associated with each doctor
        },
      });
  
      // Calculate the appointment count for each doctor
      const doctorsWithAppointmentCounts = doctorsWithAppointments.map(doctor => ({
        doctor,
        appointmentCount: doctor.appointments.length, // Get the length of appointments array
      }));
  
      // Sort doctors by appointment count in descending order
      doctorsWithAppointmentCounts.sort((a, b) => b.appointmentCount - a.appointmentCount);
  
      // Get the top 5 popular doctors
      const popularDoctors = doctorsWithAppointmentCounts.slice(0, 4);
  
      // Extract doctor details for the response
      const popularDoctorsDetails = popularDoctors.map(({ doctor }) => ({
        id: doctor.id,
        specializations: doctor.specializations,
        user: {
          Fname: doctor.user.Fname,
          Lname: doctor.user.Lname,
          profilePic: doctor.user.profilePic,
          username: doctor.user.username,
        },
      }));
  
      return popularDoctorsDetails;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error!');
    }
  }
  
}
