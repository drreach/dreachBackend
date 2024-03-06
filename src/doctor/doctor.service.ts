import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { StorageService } from 'src/storage/storage.service';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as sharp from 'sharp';
import {
  UpdateSheduleDto,
  bookAppointmentDTO,
  hybridBookAppointmentDTO,
} from 'src/user/dto/user.dto';
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
            HomeShedule: dto.shedule?.HomeShedule,
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
              schedules: true,
            },
          },
        },
      });
      console.log(shedule);
      return (
        shedule ?? {
          doctorProfile: {
            isAvailableForDesk: doctor?.isAvailableForDesk,
            mode: doctor?.mode,
            schedules: {
              DeskShedule: [],
              OnlineShedule: [],
              HomeShedule: [],
            },
          },
        }
      );
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

  async sheduleThings(username: string, dt: Date, userId?: string | undefined) {
    const today = dt.toISOString().split('T')[0];

    console.log(username);
    try {
      console.log(dt,username,userId);
      const startDate = dt;
      const numDays = 10;

      const slotDetails = [];
      const doctor = await this.prisma.user.findUnique({
        where: {
          username: username,
          doctorProfile: {
            status: 'APPROVED',
          },
        },
        include: {
          doctorProfile: {
            include: {
              schedules: true,
            },
          },
        },
      });
      console.log(doctor);
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
            status:{in:["APPROVED","PENDING"]}
          },
          select: {
            appointmentSlotTime: true,
          },
        });

        const bookedSlots = appointments.map(
          (appointment) => appointment.appointmentSlotTime,
        );

        const currentTime = dt;
        const currentHours = currentTime.getHours();
        const currentMinutes = currentTime.getMinutes();

        const availableSlots =
          doctor.doctorProfile.mode === 'VIDEO_CONSULT' &&
          doctor.doctorProfile.schedules?.OnlineShedule
            ? doctor.doctorProfile.schedules?.OnlineShedule.filter((slot) => {
                const slotHours = parseInt(slot.split(':')[0]);
                const slotMinutes = parseInt(slot.split(':')[1]);
                if (
                  (currentDate.getDate() === startDate.getDate() &&
                    slotHours < currentHours) ||
                  bookedSlots.includes(slot)
                ) {
                  return false;
                }
                if (
                  (currentDate.getDate() === startDate.getDate() &&
                    slotHours === currentHours &&
                    slotMinutes < currentMinutes) ||
                  bookedSlots.includes(slot)
                ) {
                  return false;
                }
                return true;
              })
            : [];

        console.log(availableSlots);

        //for Desk Appointment
        const availableSlotsHome =
          doctor.doctorProfile.mode === 'HOME_VISIT' &&
          doctor.doctorProfile.schedules?.HomeShedule.length > 0
            ? doctor.doctorProfile.schedules?.HomeShedule.filter((slot) => {
                const slotHours = parseInt(slot.split(':')[0]);
                const slotMinutes = parseInt(slot.split(':')[1]);
                if (
                  (currentDate.getDate() === startDate.getDate() &&
                    slotHours < currentHours) ||
                  bookedSlots.includes(slot)
                ) {
                  return false;
                }
                if (
                  (currentDate.getDate() === startDate.getDate() &&
                    slotHours === currentHours &&
                    slotMinutes < currentMinutes) ||
                  bookedSlots.includes(slot)
                ) {
                  return false;
                }
                return true;
              })
            : [];
        console.log(availableSlotsHome);

        //For desk
        const availableSlotsDesk =
          doctor.doctorProfile.isAvailableForDesk &&
          doctor.doctorProfile.schedules?.DeskShedule.length > 0
            ? doctor.doctorProfile.schedules?.DeskShedule.filter((slot) => {
                const slotHours = parseInt(slot.split(':')[0]);
                const slotMinutes = parseInt(slot.split(':')[1]);
                if (
                  (currentDate.getDate() === startDate.getDate() &&
                    slotHours < currentHours) ||
                  bookedSlots.includes(slot)
                ) {
                  return false;
                }
                if (
                  (currentDate.getDate() === startDate.getDate() &&
                    slotHours === currentHours &&
                    slotMinutes < currentMinutes) ||
                  bookedSlots.includes(slot)
                ) {
                  return false;
                }
                return true;
              })
            : [];

        const sortAvailableSlotsVideo =
          availableSlots?.length > 0
            ? availableSlots.sort((a, b) => {
                const aHours = parseInt(a.split(':')[0]);
                const bHours = parseInt(b.split(':')[0]);
                if (aHours < bHours) {
                  return -1;
                }
                if (aHours > bHours) {
                  return 1;
                }
                return 0;
              })
            : [];

        const sortAvailableSlotsDesk =
          availableSlotsDesk?.length > 0
            ? availableSlotsDesk.sort((a, b) => {
                const aHours = parseInt(a.split(':')[0]);
                const bHours = parseInt(b.split(':')[0]);
                if (aHours < bHours) {
                  return -1;
                }
                if (aHours > bHours) {
                  return 1;
                }
                return 0;
              })
            : [];

        const sortAvailableSlotsHome =
          availableSlotsHome?.length > 0
            ? availableSlotsHome.sort((a, b) => {
                const aHours = parseInt(a.split(':')[0]);
                const bHours = parseInt(b.split(':')[0]);
                if (aHours < bHours) {
                  return -1;
                }
                if (aHours > bHours) {
                  return 1;
                }
                return 0;
              })
            : [];

        console.log(sortAvailableSlotsHome);

        slotDetails.push({
          date: isoDate,
          availableSlotsVideo: sortAvailableSlotsVideo,
          availableSlotsDesk: sortAvailableSlotsDesk,
          availableSlotsHome: sortAvailableSlotsHome,
          bookedSlots: bookedSlots,
        });
      }

      let bookedByCurrentUser;
      if (userId !== 'undefined') {
        bookedByCurrentUser = await this.prisma.appointment.findFirst({
          where: {
            doctorProfileId: doctor.doctorProfile.id,
            userId: userId,
            appointmentSlotDate: {
              gte: formatISO(today),
            },
          
          },
        });

        console.log(bookedByCurrentUser);
      }

      const isDoctorAppointedEver = await this.prisma.appointment.findFirst({
        where: {
          doctorProfileId: doctor.doctorProfile.id,
          status: 'APPROVED',
        },
      });

      return {
        slotDetails,
        doctor,
        isBookedByCurrentUser: bookedByCurrentUser ? true : false,
        status: bookedByCurrentUser?.status,
        isDoctorAppointedEver: isDoctorAppointedEver ? true : false,
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  convertToLocalTime(localTime: Date): Date {
    // Adjust the local time to the USA timezone
    // For example, if local timezone is UTC+5:30 and USA timezone is UTC-8,
    // you'd subtract 13.5 hours (5:30 hours + 8 hours) from the local time
    const usTimezoneOffset = -8 * 60; // Offset in minutes for US Pacific Time (UTC-8)
    const serverTime = new Date(localTime.getTime() - (localTime.getTimezoneOffset() + usTimezoneOffset) * 60000);
    
    return serverTime;
  }
  async getSheduleByHome(username: string, userId?: string | undefined) {
    const today = this.convertToLocalTime(new Date()).toISOString().split('T')[0];

    console.log(typeof userId);
    try {
      const startDate = new Date();
      const numDays = 10;

      const slotDetails = [];
      const doctor = await this.prisma.user.findUnique({
        where: {
          username: username,
          doctorProfile: {
            status: 'APPROVED',
            mode: 'HOME_VISIT',
          },
        },
        include: {
          doctorProfile: {
            include: {
              schedules: true,
            },
          },
        },
      });
      console.log(doctor);
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
            type: 'HOME_VISIT',
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

        //
        // console.log(availableSlots);

        //for Desk Appointment
        const availableSlotsHome =
          doctor.doctorProfile.mode === 'HOME_VISIT' &&
          doctor.doctorProfile.schedules?.HomeShedule.length > 0
            ? doctor.doctorProfile.schedules?.HomeShedule.filter((slot) => {
                const slotHours = parseInt(slot.split(':')[0]);
                const slotMinutes = parseInt(slot.split(':')[1]);
                if (
                  (currentDate.getDate() === startDate.getDate() &&
                    slotHours < currentHours) ||
                  bookedSlots.includes(slot)
                ) {
                  return false;
                }
                if (
                  (currentDate.getDate() === startDate.getDate() &&
                    slotHours === currentHours &&
                    slotMinutes < currentMinutes) ||
                  bookedSlots.includes(slot)
                ) {
                  return false;
                }
                return true;
              })
            : [];
        console.log(availableSlotsHome);

        const sortAvailableSlotsHome =
          availableSlotsHome?.length > 0
            ? availableSlotsHome.sort((a, b) => {
                const aHours = parseInt(a.split(':')[0]);
                const bHours = parseInt(b.split(':')[0]);
                if (aHours < bHours) {
                  return -1;
                }
                if (aHours > bHours) {
                  return 1;
                }
                return 0;
              })
            : [];

        console.log(sortAvailableSlotsHome);

        slotDetails.push({
          date: isoDate,
          availableSlotsVideo: [],
          availableSlotsDesk: [],
          availableSlotsHome: sortAvailableSlotsHome,
          bookedSlots: bookedSlots,
        });
      }

      let bookedByCurrentUser;
      if (userId !== 'undefined') {
        bookedByCurrentUser = await this.prisma.appointment.findFirst({
          where: {
            doctorProfileId: doctor.doctorProfile.id,
            userId: userId,
            // type:"HOME_VISIT",
            appointmentSlotDate: {
              gte: formatISO(today),
            },
          },
        });

        console.log(bookedByCurrentUser);
      }

      const isDoctorAppointedEver = await this.prisma.appointment.findFirst({
        where: {
          doctorProfileId: doctor.doctorProfile.id,
          status: 'APPROVED',
        },
      });

      return {
        slotDetails,
        doctor,
        isBookedByCurrentUser: bookedByCurrentUser ? true : false,
        status: bookedByCurrentUser?.status,
        isDoctorAppointedEver: isDoctorAppointedEver ? true : false,
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async getDoctorProfileByVideo(
    username: string,
    userId?: string | undefined,
    date?: string,
    slots?: string,
  ) {
    const today =this.convertToLocalTime(new Date()).toISOString().split('T')[0];

    console.log(typeof userId);
    try {
      const startDate = new Date(date);
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
      console.log(doctor);
      if (!doctor) throw new UnauthorizedException('Unauthorized Access');

      const currentDate = new Date(startDate);

      const isoDate = formatISO(date);
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
        doctor.doctorProfile.mode === 'VIDEO_CONSULT' &&
        doctor.doctorProfile.schedules?.OnlineShedule
          ? doctor.doctorProfile.schedules?.OnlineShedule.filter((slot) => {
              const slotHours = parseInt(slot.split(':')[0]);
              const slotMinutes = parseInt(slot.split(':')[1]);
              if (
                (currentDate.getDate() === startDate.getDate() &&
                  slotHours < currentHours) ||
                bookedSlots.includes(slot)
              ) {
                return false;
              }
              if (
                (currentDate.getDate() === startDate.getDate() &&
                  slotHours === currentHours &&
                  slotMinutes < currentMinutes) ||
                bookedSlots.includes(slot)
              ) {
                return false;
              }
              return true;
            })
          : [];

      console.log(availableSlots);

      // Add 30 minutes to each available slot
      const availableSlotsAfter30Minutes = availableSlots.map((slot) => {
        const [hours, minutes] = slot.split(':').map(Number);
        const slotDate = new Date(date);
        slotDate.setHours(hours, minutes);
        slotDate.setMinutes(slotDate.getMinutes() + 30);
        return format(slotDate, 'HH:mm');
      });

      console.log(availableSlotsAfter30Minutes);

      const providedSlot = slots ? slots.split(':').map(Number) : null;
      const availableSlotsAfterProvidedSlot =
        availableSlotsAfter30Minutes.filter((slot) => {
          if (!providedSlot) return false; // If no slot provided, no need to filter
          const [hours, minutes] = slot.split(':').map(Number);
          return hours >= providedSlot[0] && minutes >= providedSlot[1];
        });

      const sortAvailableSlotsVideo =
        availableSlotsAfterProvidedSlot.length > 0
          ? availableSlotsAfterProvidedSlot.sort((a, b) => {
              const aHours = parseInt(a.split(':')[0]);
              const bHours = parseInt(b.split(':')[0]);
              if (aHours < bHours) {
                return -1;
              }
              if (aHours > bHours) {
                return 1;
              }
              return 0;
            })
          : [];

      slotDetails.push({
        date: isoDate,
        availableSlotsVideo: sortAvailableSlotsVideo,
        bookedSlots: bookedSlots,
      });

      let bookedByCurrentUser;
      if (userId !== 'undefined') {
        bookedByCurrentUser = await this.prisma.appointment.findFirst({
          where: {
            doctorProfileId: doctor.doctorProfile.id,
            userId: userId,
            appointmentSlotDate: {
              gte: formatISO(today),
            },
          },
        });

        console.log(bookedByCurrentUser);
      }

      const isDoctorAppointedEver = await this.prisma.appointment.findFirst({
        where: {
          doctorProfileId: doctor.doctorProfile.id,
          status: 'APPROVED',
        },
      });

      return {
        slotDetails,
        doctor,
        isBookedByCurrentUser: bookedByCurrentUser ? true : false,
        status: bookedByCurrentUser?.status,
        isDoctorAppointedEver: isDoctorAppointedEver ? true : false,
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Something went wrong');
    }
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

      const sortAvailableSlotsVideo =
        availableSlots.length > 0
          ? availableSlots.sort((a, b) => {
              const aHours = parseInt(a.split(':')[0]);
              const bHours = parseInt(b.split(':')[0]);
              if (aHours < bHours) {
                return -1;
              }
              if (aHours > bHours) {
                return 1;
              }
              return 0;
            })
          : [];

      console.log(sortAvailableSlotsVideo);
      const today = this.convertToLocalTime(new Date()).toISOString().split('T')[0];

      let bookedByCurrentUser;
      if (userId !== 'undefined') {
        bookedByCurrentUser = await this.prisma.appointment.findFirst({
          where: {
            doctorProfileId: doctor.doctorProfile.id,
            userId: userId,
            appointmentSlotDate: {
              gte: formatISO(today),
            },
          },
        });

        console.log(bookedByCurrentUser);
      }

      return {
        availableSlots,
        doctor,
        isBookedByCurrentUser: bookedByCurrentUser ? true : false,
        status: bookedByCurrentUser?.status,
        isDoctorAppointedEver: false,
      };
    } catch (error) {
      console.log(error);
    }
  }

  async checkDoctorAvailability(
    doctorId: string,
    date: string,
    slot: string,
    mode: string,
  ) {
    try {
      console.log(date);

      const appointments = await this.prisma.appointment.findMany({
        where: {
          doctorProfileId: doctorId,
          appointmentSlotDate: formatISO(date),
          type: mode,
          status: {in:["APPROVED","PENDING"]},
        },
        select: {
          appointmentSlotTime: true,
        },
      });

      console.log(appointments);

      const bookedSlots = appointments.map(
        (appointment) => appointment.appointmentSlotTime,
      );

      console.log(bookedSlots);
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
      let availableSlots;

      if (mode === 'VIDEO_CONSULT') {
        availableSlots = doctor.schedules.OnlineShedule.filter(
          (s) => !bookedSlots.includes(s),
        );
      } else if (mode === 'HOME_VISIT') {
        availableSlots = doctor.schedules.HomeShedule.filter(
          (s) => !bookedSlots.includes(s),
        );
      } else if (mode === 'CLINIC_VISIT') {
        availableSlots = doctor.schedules.DeskShedule.filter(
          (s) => !bookedSlots.includes(s),
        );
      }
      return {
        doctor: doctor,
        isAvailable: availableSlots.includes(slot),
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }
  async hybridCheckDoctorAvailability(dto: {
    homeVisitDoctorId: string;
    h_apptDate: string;
    h_slotTime: string;
    videoDoctorId: string;
    v_apptDate: string;
    v_slotTime: string;
  }) {
    try {
      // Check availability for video consultation doctor
      const videoAppointments = await this.prisma.appointment.findMany({
        where: {
          doctorProfileId: dto.videoDoctorId,
          appointmentSlotDate: formatISO(dto.v_apptDate),
        },
        select: {
          appointmentSlotTime: true,
        },
      });

      const videoBookedSlots = videoAppointments.map(
        (appointment) => appointment.appointmentSlotTime,
      );

      const videoDoctor = await this.prisma.doctorProfile.findUnique({
        where: {
          id: dto.videoDoctorId,
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

      const videoAvailableSlots = videoDoctor.schedules.OnlineShedule.filter(
        (s) => !videoBookedSlots.includes(s),
      );

      // Check availability for home visit doctor
      const homeAppointments = await this.prisma.appointment.findMany({
        where: {
          doctorProfileId: dto.homeVisitDoctorId,
          appointmentSlotDate: formatISO(dto.h_apptDate),
        },
        select: {
          appointmentSlotTime: true,
        },
      });

      const homeBookedSlots = homeAppointments.map(
        (appointment) => appointment.appointmentSlotTime,
      );

      const homeDoctor = await this.prisma.doctorProfile.findUnique({
        where: {
          id: dto.homeVisitDoctorId,
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

      const homeAvailableSlots = homeDoctor.schedules.HomeShedule.filter(
        (s) => !homeBookedSlots.includes(s),
      );

      // Check if both doctors are available for the given slots
      //check if that slot is available for both the doctors

      const isVideoAvailable = videoAvailableSlots.includes(dto.v_slotTime);
      const isHomeVisitAvailable = homeAvailableSlots.includes(dto.h_slotTime);

      const { schedules: s1, ...res } = videoDoctor;
      const { schedules: s2, ...res1 } = homeDoctor;

      return {
        homeDoctor: res1,
        videoDoctor: res,
        isVideoDoctorAvailable: isVideoAvailable,
        isHomeVisitDoctorAvailable: isHomeVisitAvailable,
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async checkDoctorAvailableShedule(
    doctorId: string,
    date: any,
    slot: string,
    mode: string,
  ) {
    try {
      console.log('givenDate::', date, doctorId, mode, slot);
      const appointments = await this.prisma.appointment.findMany({
        where: {
          doctorProfileId: doctorId,
          // appointmentSlotDate: date,
          type: mode,
          status: {in:["APPROVED","PENDING"]},
        },
        select: {
          appointmentSlotTime: true,
          appointmentSlotDate: true,
        },
      });

      console.log('appt', appointments);
      const bookedSlots = appointments.map(
        (appointment) => appointment.appointmentSlotTime,
      );

      console.log('bookedSlots:', bookedSlots);

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

      let availableSlots;

      if (mode === 'HOME_VISIT') {
        availableSlots = doctor.schedules.HomeShedule.filter(
          (s) => !bookedSlots.includes(s),
        );
      } else if (mode === 'VIDEO_CONSULT') {
        availableSlots = doctor.schedules.OnlineShedule.filter(
          (s) => !bookedSlots.includes(s),
        );
      } else if (mode === 'CLINIC_VISIT') {
        availableSlots = doctor.schedules.DeskShedule.filter(
          (s) => !bookedSlots.includes(s),
        );
      }

      console.log('availableSlots:', availableSlots, 'givenSlots', slot);

      return availableSlots ? availableSlots.includes(slot) : false;
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
      console.log(dto.type);
      const checkAvailabilty = await this.checkDoctorAvailableShedule(
        dto.doctorProfileId,
        new Date(dto.appointmentSlotDate),
        dto.appointmentSlotTime,
        dto.type,
      );
      console.log(checkAvailabilty);
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
          reason: dto.reason,
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

  async hybridBookAppointment(dto: hybridBookAppointmentDTO) {
    try {
      console.log(
        dto,
        'iso',
        formatISO(new Date(dto.h_apptDate)),
        formatISO(dto.v_apptDate),
        new Date(dto.h_apptDate),
        new Date(dto.v_apptDate),
      );
      const checkAvailabilty = await this.checkDoctorAvailableShedule(
        dto.homeDoctorId,
        new Date(dto.h_apptDate),
        // formatISO(dto.h_apptDate),
        dto.h_slot,
        'HOME_VISIT',
      );

      // console.log(checkAvailabilty);

      const checkVideoAvailability = await this.checkDoctorAvailableShedule(
        dto.videoDoctorId,
        new Date(dto.v_apptDate),
        // formatISO(dto.v_apptDate),
        dto.v_slot,
        'VIDEO_CONSULT',
      );

      console.log(checkAvailabilty, checkVideoAvailability);

      if (!checkAvailabilty || !checkVideoAvailability) {
        console.log('here');
        throw new BadRequestException('Slot not available');
      }

      const appointment = await this.prisma.$transaction([
        this.prisma.appointment.create({
          data: {
            doctorProfileId: dto.homeDoctorId,
            userId: dto.userId,
            appointmentSlotDate: formatISO(dto.h_apptDate),
            appointmentSlotTime: dto.h_slot,
            type: 'HOME_VISIT',
            status: 'PENDING',
            reason: dto.reason,
          },
        }),
        this.prisma.appointment.create({
          data: {
            doctorProfileId: dto.videoDoctorId,
            userId: dto.userId,
            appointmentSlotDate: formatISO(dto.v_apptDate),
            appointmentSlotTime: dto.v_slot,
            type: 'VIDEO_CONSULT',
            status: 'PENDING',
            reason: dto.reason,
          },
        }),
      ]);

      if (!appointment) {
        throw new BadRequestException('Appointment not created');
      }

      return appointment;

      // const appointment = await this.prisma.appointment.create({
      //   data: {
      //     doctorProfileId: dto.doctorProfileId,
      //     userId: dto.userId,
      //     appointmentSlotDate: formatISO(dto.appointmentSlotDate),
      //     appointmentSlotTime: dto.appointmentSlotTime,
      //     type: dto.type,
      //     CurrentLocation: dto.currentLocation,
      //     status: 'PENDING',
      //   },
      // });

      // console.log(appointment);

      // return appointment;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async doctorDashboardInfo(doctorProfileId: string) {
    console.log(doctorProfileId);
    if (!doctorProfileId) {
      throw new BadRequestException('Invalid doctorProfileId');
    }
    try {
      const totalAppointments = await this.prisma.appointment.count({
        where: {
          doctorProfileId: doctorProfileId,
        },
      });

      const totalPendingAppointments = await this.prisma.appointment.count({
        where: {
          doctorProfileId: doctorProfileId,
          status: 'PENDING',
        },
      });

      const totalApprovedAppointments = await this.prisma.appointment.count({
        where: {
          doctorProfileId: doctorProfileId,
          status: 'APPROVED',
        },
      });

      const totalRejectedAppointments = await this.prisma.appointment.count({
        where: {
          doctorProfileId: doctorProfileId,
          status: 'REJECTED',
        },
      });

      //getToday date
      const today =this.convertToLocalTime(new Date()).toISOString().split('T')[0];

      // const todayAppointments = await this.prisma.appointment.count({
      //   where:{
      //     doctorProfileId:doctorProfileId,
      //     appointmentSlotDate:formatISO(today)
      //   }
      // });

      const todayAppointMentdDetails = await this.prisma.appointment.findMany({
        where: {
          doctorProfileId: doctorProfileId,
          appointmentSlotDate: formatISO(today),
        },

        select: {
          user: {
            select: {
              Fname: true,
              Lname: true,
              contact: true,
              profilePic: true,
              userId: true,
            },
          },
          isForOthers: true,
          othersContact: true,
          appointmentSlotTime: true,
          reason: true,
          id: true,
          status: true,
          doctorProfileId: true,
          userId: true,
        },
      });

      const upcomingAppointsMents = await this.prisma.appointment.findMany({
        where: {
          doctorProfileId: doctorProfileId,
          appointmentSlotDate: {
            gt: formatISO(new Date()),
          },
        },

        select: {
          user: {
            select: {
              Fname: true,
              Lname: true,
              contact: true,
              profilePic: true,
            },
          },
          isForOthers: true,
          othersContact: true,
          appointmentSlotTime: true,
          appointmentSlotDate: true,
          reason: true,
          id: true,
          doctorProfileId: true,
          status: true,
          userId: true,
        },
      });

      return {
        totalAppointments,
        totalPendingAppointments,
        totalApprovedAppointments,
        totalRejectedAppointments,
        totalTodayAppointments: todayAppointMentdDetails.length,
        todayAppointMentdDetails,
        upcomingAppointsMents,
      };
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

  async getPatients(doctorProfileId: string) {
    try {
      const patients = await this.prisma.appointment.findMany({
        where: {
          doctorProfileId: doctorProfileId,
          status: 'APPROVED',
        },
        select: {
          user: {
            select: {
              Fname: true,
              Lname: true,
              address: true,
              bloodGroup: true,
              contact: true,
              dob: true,
              email: true,
              profilePic: true,
              userId: true,
            },
          },
        },
      });
      // filter duplicate patients
      const removeDuplicates = patients.filter((patient, index, self) => {
        const index_ = self.findIndex(
          (t) => t.user.userId === patient.user.userId,
        );
        return index === index_;
      });

      return removeDuplicates;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async actionOnPatients(dto: {
    doctorProfileId;
    userId: string;
    action: string;
    apptId: string;
  }) {
    console.log(dto);
    try {
      const update = await this.prisma.appointment.update({
        where: {
          id: dto.apptId,
          doctorProfileId: dto.doctorProfileId,
        },
        data: {
          status: dto.action,
        },
      });

      return update;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async getPatientsMedicalByDoctor(pid: string, doctorId?: string) {
    try {
      const patient = await this.prisma.user.findUnique({
        where: {
          userId: pid,
        },

        select: {
          medicalRecords: {
            include: {
              doctorProfile: {
                select: {
                  user: {
                    select: {
                      Fname: true,
                      Lname: true,
                      profilePic: true,
                    },
                  },
                },
              },
            },
          },
          id: true,
        },
      });
      let isMyDoctor;

      if (doctorId) {
        isMyDoctor = await this.prisma.appointment.findFirst({
          where: {
            status: 'APPROVED',
            doctorProfileId: doctorId,
            userId: patient.id,
          },
        });
      }

      return {
        patient,
        isMyDoctor: isMyDoctor ? true : false,
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async getPatientsMedicalBySelf(userId: string) {
    try {
      const patient = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          medicalRecords: {
            include: {
              doctorProfile: {
                select: {
                  user: {
                    select: {
                      Fname: true,
                      Lname: true,
                      profilePic: true,
                    },
                  },
                },
              },
            },
          },
          id: true,
        },
      });

      return {
        patient,
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async getPatientsInfo(pid: string) {
    try {
      const patient = await this.prisma.user.findUnique({
        where: {
          userId: pid,
        },
        select: {
          Fname: true,
          Lname: true,
          address: true,
          bloodGroup: true,
          contact: true,
          dob: true,
          email: true,
          profilePic: true,
          userId: true,
        },
      });

      return patient;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async addMedicalRecord(
    patientsId: string,
    doctorId,
    file: Express.Multer.File,
    description: string,
  ) {
    try {
      if (!file || !patientsId || !patientsId)
        throw new BadRequestException('Bad Request');

      const mediaId = await this.generateMediaId();
      // const filebuffer = await sharp(file.buffer)
      //   .webp({ quality: 80 }) // Adjust quality as needed
      //   .toBuffer();
      const p = await this.storageService.save(
        'medicalRecords/' + mediaId,
        file.mimetype, // Set the mimetype for WebP
        file.buffer,
        [{ mediaId: mediaId }],
      );

      if (!p) throw new InternalServerErrorException('Internal Server Error!');

      const create = await this.prisma.medicalRecord.create({
        data: {
          doctorProfileId: doctorId,
          userId: patientsId,
          attachment: mediaId,
          description: description,
          recordId: `R-${await this.generateMediaId()}`,
        },
      });

      if (!create) throw new InternalServerErrorException('Record Not Added');

      console.log(create);
      return create;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async addDocuments(doctorId: string, file: Express.Multer.File) {
    try {
      if (!file || !doctorId) throw new BadRequestException('Bad Request');

      const doctor = await this.prisma.doctorProfile.findUnique({
        where: {
          id: doctorId,
        },
        select: {
          document: true,
        },
      });

      if (doctor.document)
        throw new ConflictException('Document already exists');

      const mediaId = await this.generateMediaId();
      const p = await this.storageService.save(
        'doctorDocuments/' + mediaId,
        file.mimetype, // Set the mimetype for WebP
        file.buffer,
        [{ mediaId: mediaId }],
      );

      if (!p) throw new InternalServerErrorException('Internal Server Error!');

      const create = await this.prisma.doctorProfile.update({
        where: {
          id: doctorId,
        },
        data: {
          document: mediaId,
        },
      });

      if (!create) throw new InternalServerErrorException('Record Not Added');

      console.log(create);
      return create;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async removeDocuments(doctorId: string) {
    try {
      if (!doctorId) throw new BadRequestException('Bad Request');

      const doctor = await this.prisma.doctorProfile.findUnique({
        where: {
          id: doctorId,
        },
        select: {
          document: true,
        },
      });

      if (!doctor) throw new BadRequestException('Doctor Not Found');

      if (!doctor.document) throw new NotFoundException('Document Not Found');

      await this.storageService.delete('doctorDocuments/' + doctor.document);

      const update = await this.prisma.doctorProfile.update({
        where: {
          id: doctorId,
        },
        data: {
          document: null,
        },
      });

      return update;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
