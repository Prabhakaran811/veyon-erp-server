
import mongoose, { Schema, Document } from "mongoose";

export type ProjectStatus =
  | "Planning"
  | "In Progress"
  | "On Hold"
  | "Completed"
  | "Cancelled";

export interface IProject extends Document {
  projectCode: string;
  projectName: string;
  customer: mongoose.Types.ObjectId;
  projectStatus: ProjectStatus;
  customerPONumber?: string;
  poDate?: Date;
  poValue?: number;
  projectStartDate?: Date;
  projectEndDate?: Date;
  siteLocation?: string;
  projectScopeAndEngineeringNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    projectCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },

    projectName: {
      type: String,
      required: true,
      trim: true
    },

    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },

    projectStatus: {
      type: String,
      enum: [
        "Planning",
        "In Progress",
        "On Hold",
        "Completed",
        "Cancelled"
      ],
      default: "Planning",
      required: true
    },

    customerPONumber: {
      type: String,
      trim: true
    },

    poDate: {
      type: Date
    },

    poValue: {
      type: Number,
      min: 0
    },

    projectStartDate: {
      type: Date
    },

    projectEndDate: {
      type: Date
    },

    siteLocation: {
      type: String,
      trim: true
    },

    projectScopeAndEngineeringNotes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Project = mongoose.model<IProject>(
  "Project",
  projectSchema
);

export default Project;
