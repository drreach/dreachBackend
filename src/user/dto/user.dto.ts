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

export class createUserDto {
  @IsString()
  name: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

// id             String          @id @default(auto()) @map("_id") @db.ObjectId
//   username       String          @unique
//   Fname          String?
//   Lname          String?
//   email          String @unique
//   age            Int?
//   dob            DateTime?
//   bloodGroup     BloodGroup?
//   address        Address?
//   contact        String?
//   role           Role   // Enum: "NORMAL", "DOCTOR", "ADMIN"
//   doctorProfile  DoctorProfile?
//   appointments   Appointment[]
//   medicalRecords MedicalRecord[]
//   userId         String @unique

export class UpdatePatientsDetailsDto {
  @IsString()
  Fname: string;

  @IsString()
  Lname: string;

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
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  zip: string;

  @IsOptional()
  @IsString()
  contact: string;
}

enum Status {
  PENDING,
  ACCEPTED,
  REJECTED,
  COMPLETED,
  INITIATED,
}

export class UpdateUserDetailsDto {
  @IsString()
  Fname: string;

  @IsString()
  Lname: string;

  @IsOptional()
  @IsString()
  dob: string;

  @IsOptional()
  @IsString()
  gender: string;

  @IsOptional()
  @IsString()
  bloodGroup: string;

  @IsOptional()
  @IsObject()
  Address: {
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
}

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
  mode : string;

  
  @IsString()
  @IsOptional()
  description: string;
  @IsString()
  doctorProfileId: string;
}




export class UpdateSheduleDto{
  @IsString()
  doctorProfileId: string;

  @IsObject()
  shedule: {
    OnlineShedule:[],
    DeskShedule:[]
  };
}


export class bookAppointmentDTO{
  @IsString()
  doctorProfileId: string;

  @IsString()
  userId: string;

  @IsString()
  appointmentSlotDate: string;

  @IsString()
  appointmentSlotTime: string;

  @IsString()
  type: string;


  @IsObject()
  currentLocation:{
    lat: number;
    long: number;
  }

  @IsBoolean()
  isForOthers: boolean;

  @IsOptional()
  @IsString()
  othersName: string;

  @IsOptional()
  @IsString()
  othersContact: string;

  @IsOptional()
  @IsString()
  othersEmail: string;


}