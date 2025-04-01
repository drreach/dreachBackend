import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsJSON,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  isJSON,
  isString,
} from 'class-validator';

export class UpdateDoctorDetailsDto {
  @IsString()
  Fname: string;

  @IsString()
  Lname: string;

  @IsOptional()
  @IsString()
  gender: string;

  @IsString()
  status: any;

  @IsOptional()
  @IsNumber()
  age: number;

  @IsOptional()
  @IsString()
  dob: string;

  @IsOptional()
  @IsString()
  bloodGroup: string;

  @IsOptional()
  @IsObject()
  address: {
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };

  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  contact: string;

  @IsOptional()
  @IsNumber()
  fee: number;

  @IsOptional()
  @IsArray()
  specializations: string[];

  @IsOptional()
  @IsArray()
  educations: { university: string; degree: string; duration: string }[];

  @IsOptional()
  @IsArray()
  clinicInfo: {
    clinicName: string;
    address: string;
    contact: string;
    images: [];
  }[];

  @IsOptional()
  @IsArray()
  workExperiences: { clinic: string; duration: string }[];

  @IsOptional()
  @IsArray()
  awards: { title: string; date: string; description: string }[];

  @IsObject()
  @IsOptional()
  schedules: {};

  @IsBoolean()
  @IsOptional()
  isAvailableForDesk: boolean;

  @IsString()
  @IsOptional()
  mode: string;

  @IsString()
  @IsOptional()
  description: string;
  @IsString()
  doctorProfileId: string;
}

export class UpdateSheduleDto {
  @IsString()
  doctorProfileId: string;

  @IsObject()
  shedule: {
    OnlineShedule: [];
    DeskShedule: [];
    HomeShedule: [];
  };
}
