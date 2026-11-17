
import mongoose, { Document, Schema } from "mongoose";

export type EmployeeGender = "Male" | "Female" | "Other";

export type EmployeeType =
  | "Permanent"
  | "Contract"
  | "Intern"
  | "Temporary";

export type EmploymentStatus =
  | "Active"
  | "Inactive"
  | "Resigned"
  | "Terminated";

export interface IEmployee extends Document {
  employeeCode: string;
  employeeName: string;
  gender?: EmployeeGender;
  dateOfBirth?: Date;

  phoneNumber: string;
  emailAddress?: string;
  address?: string;

  emergencyContactName?: string;
  emergencyContactNumber?: string;

  department: string;
  designation: string;
  employeeType: EmployeeType;
  joiningDate: Date;
  reportingManager?: mongoose.Types.ObjectId;
  employmentStatus: EmploymentStatus;

  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },

    employeeName: {
      type: String,
      required: true,
      trim: true
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"]
    },

    dateOfBirth: {
      type: Date
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },

    emailAddress: {
      type: String,
      trim: true,
      lowercase: true
    },

    address: {
      type: String,
      trim: true
    },

    emergencyContactName: {
      type: String,
      trim: true
    },

    emergencyContactNumber: {
      type: String,
      trim: true
    },

    department: {
      type: String,
      required: true,
      trim: true
    },

    designation: {
      type: String,
      required: true,
      trim: true
    },

    employeeType: {
      type: String,
      enum: ["Permanent", "Contract", "Intern", "Temporary"],
      required: true,
      default: "Permanent"
    },

    joiningDate: {
      type: Date,
      required: true
    },

    reportingManager: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null
    },

    employmentStatus: {
      type: String,
      enum: ["Active", "Inactive", "Resigned", "Terminated"],
      default: "Active"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Employee = mongoose.model<IEmployee>(
  "Employee",
  employeeSchema
);

export default Employee;
