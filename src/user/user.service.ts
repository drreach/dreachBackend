import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
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
import { formatISO } from 'date-fns';

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

    const doctor = await this.prisma.doctorProfile.findUnique({
      where: {
        id: doctorProfileId,
      },
      select: {
        document: true,
      },
    });

    if (!doctor) throw new NotFoundException('Documrn not found');
    if (!doctor.document) throw new NotFoundException('Document not found');

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
    const isDoctorExist = await this.prisma.doctorProfile.findUnique({
      where: {
        id: doctorProfileId,
      },
    });

    if (!isDoctorExist) throw new NotFoundException('Doctor not found');

    const updatedUser = await this.prisma.doctorProfile.update({
      where: {
        id: doctorProfileId,
      },
      data: {
        ...res,
        status: isDoctorExist.status === 'APPROVED' ? 'APPROVED' : 'PENDING',
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

  async findDoctorsList(dto: { speciality: string; address: string }) {
    try {
      // const whereClause: any = {
      //   status: 'APPROVED',
      // };

      // if (dto.speciality !== 'NONE') {
      //   whereClause.specializations = {
      //     has: dto.speciality,
      //   };
      // }

      // if (dto.address !== 'NONE') {
      //   whereClause.user = {
      //     OR: [
      //       { address: { contains: dto.address } },
      //       { city: { contains: dto.address } },
      //       { state: { contains: dto.address } },
      //       { country: { contains: dto.address } },
      //       { pincode: { contains: dto.address } }
      //     ]
      //   };
      // }

      const doctor = await this.prisma.doctorProfile.findMany({
        where: {
          status: 'APPROVED',
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

      console.log(filteredDoctor);

      return filteredDoctor;
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

  // async findDoctorByVideoConsultation(dto:{date:string,slot:string}){
  //   try {
  //     const doctor = await this.prisma.doctorProfile.findMany({
  //       where: {
  //         mode: 'VIDEO_CONSULT',
  //       },
  //       select: {
  //         id: true,
  //         specializations: true,
  //         fee: true,

  //         mode: true,
  //         isAvailableForDesk: true,
  //         schedules:true,
  //         appointments:true,
  //         user: {
  //           select: {
  //             Fname: true,
  //             Lname: true,
  //             email: true,
  //             contact: true,
  //             address: true,
  //             profilePic: true,
  //             username: true,
  //           },
  //         },
  //       },
  //     });

  //     const min = parseInt(dto.slot.split(":")[1]);
  //     const hr = parseInt(dto.slot.split(":")[0]);
  //     const newMin = min+30;

  //     // const appointment = await this.prisma.appointment.findMany({
  //     //   where:{
  //     //     doctorProfile:{
  //     //       mode:"VIDEO_CONSULT",
  //     //     },
  //     //     appointmentSlotDate:formatISO(dto.date),
  //     //     //CHECK IF THE DOCTOR SLOT IS AVAILABLE by using the slot time plus 30 minutes

  //     //   }
  //     // });

  //     const currentDate = new Date(dto.date);

  //     doctor.map(async(d)=>{

  //       const getAp = await this.prisma.appointment.findMany({
  //         where:{
  //           doctorProfileId:d.id,
  //           appointmentSlotDate:formatISO(dto.date),
  //          type:"VIDEO_CONSULT",
  //         },
  //         select:{
  //           appointmentSlotTime:true,
  //         }
  //       });

  //       const bookedSlots = getAp.map(
  //         (appointment) => appointment.appointmentSlotTime,
  //       );

  //       const today = new Date();

  //     const available =
  //         d?.schedules.OnlineShedule.filter(
  //           (slot) => {
  //             const slotHours = parseInt(slot.split(':')[0]);
  //             const slotMinutes = parseInt(slot.split(':')[1]);
  //             if (
  //               (today.getDate()===currentDate.getDate() &&
  //               slotHours < currentDate.getHours()) || bookedSlots.includes(slot)
  //             ) {
  //               return false;
  //             }
  //             if (
  //               currentDate.getDate() === today.getDate() &&
  //               (slotHours === currentDate.getHours() &&
  //               slotMinutes+30 < currentDate.getMinutes()) || bookedSlots.includes(slot)
  //             ) {
  //               return false;
  //             }
  //             return true;
  //           }
  //         );

  //         });

  //     // return doctor;
  //   } catch (error) {
  //     console.log(error);
  //     throw new InternalServerErrorException('Internal Server Error!');
  //   }
  // }

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
      // get all appointments for the given date
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

      const currentTime = new Date();
      const currentDt = currentTime.getDate();
      const currentHours = currentTime.getHours();
      const currentMinutes = currentTime.getMinutes();
      const totoalCurrentTime = currentHours * 60 + currentMinutes;
      //filter the appointments slots available after 30 min
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

      console.log(doctors);

      const currentDate = new Date(dto.date);
      const currentSlot =
        parseInt(dto.slot.split(':')[0]) * 60 +
        parseInt(dto.slot.split(':')[1]);

      const currentTime = new Date();
      const currentDt = currentTime.getDate();
      const currentHours = currentTime.getHours();
      const currentMinutes = currentTime.getMinutes();

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

          // const bookedSlots = new Set(appointments.map(appointment => {
          //   const slot = appointment.appointmentSlotTime.split(':');
          //   return parseInt(slot[0]) * 60 + parseInt(slot[1]);
          // }));

          const bookedSlots = appointments.map(
            (appointment) => appointment.appointmentSlotTime,
          );

          // const available = doctor.schedules?.OnlineShedule.filter(slot => {
          //   const slotTime = parseInt(slot.split(':')[0]) * 60 + parseInt(slot.split(':')[1]);
          //   return !bookedSlots.has(slotTime) && slotTime >= currentSlot && slotTime <= currentSlot + 30;
          // });

          console.log(doctor);
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
}
