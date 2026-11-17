
import mongoose, { Document, Schema } from "mongoose";

export type LeaveType =
  | "Casual Leave"
  | "Sick Leave"
  | "Earned Leave"
  | "Unpaid Leave"
  | "Other";

export type LeaveDuration = "Full Day" | "Half Day";

export interface IEmployeeLeave extends Document {
  employee: mongoose.Types.ObjectId;
  leaveType: LeaveType;
  fromDate: Date;
  toDate: Date;
  duration: LeaveDuration;
  totalDays: number;
  reason?: string;
  remarks?: string;
  recordedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const employeeLeaveSchema = new Schema<IEmployeeLeave>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    leaveType: {
      type: String,
      enum: [
        "Casual Leave",
        "Sick Leave",
        "Earned Leave",
        "Unpaid Leave",
        "Other",
      ],
      required: true,
    },

    fromDate: {
      type: Date,
      required: true,
    },

    toDate: {
      type: Date,
      required: true,
    },

    duration: {
      type: String,
      enum: ["Full Day", "Half Day"],
      default: "Full Day",
      required: true,
    },

    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
    },

    reason: {
      type: String,
      trim: true,
    },

    remarks: {
      type: String,
      trim: true,
    },

    recordedBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IEmployeeLeave>(
  "EmployeeLeave",
  employeeLeaveSchema
);
