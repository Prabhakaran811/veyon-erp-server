
import mongoose, { Schema, Document } from "mongoose";

export type ServiceReportStatus =
  | "Draft"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export interface IServiceEquipment {
  equipmentName: string;
  make?: string;
  model?: string;
  serialNumberOrTag?: string;
  remarks?: string;
}

export interface IServiceSolution {
  solutionDescription: string;
  remarks?: string;
}

export interface IServiceMaterial {
  materialDescription: string;
  partNumber?: string;
  quantity: number;
  unit: string;
  remarks?: string;
}

export interface IServiceReport extends Document {
  serviceReportNumber: string;
  serviceDate: Date;

  deliveryChallan?: mongoose.Types.ObjectId;
  status: ServiceReportStatus;

  customer: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId;

  serviceEngineer: string;
  siteLocation?: string;

  startTime?: string;
  endTime?: string;

  equipmentDetails: IServiceEquipment[];
  problemDescription?: string;
  solutions: IServiceSolution[];
  materialsUsed: IServiceMaterial[];

  customerFeedback?: string;
  customerRepresentativeName?: string;

  createdAt: Date;
  updatedAt: Date;
}

const equipmentSchema = new Schema<IServiceEquipment>(
  {
    equipmentName: {
      type: String,
      required: true,
      trim: true
    },
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    serialNumberOrTag: { type: String, trim: true },
    remarks: { type: String, trim: true }
  },
  { _id: true }
);

const solutionSchema = new Schema<IServiceSolution>(
  {
    solutionDescription: {
      type: String,
      required: true,
      trim: true
    },
    remarks: { type: String, trim: true }
  },
  { _id: true }
);

const materialSchema = new Schema<IServiceMaterial>(
  {
    materialDescription: {
      type: String,
      required: true,
      trim: true
    },
    partNumber: { type: String, trim: true },
    quantity: {
      type: Number,
      required: true,
      min: 0.001
    },
    unit: {
      type: String,
      required: true,
      trim: true
    },
    remarks: { type: String, trim: true }
  },
  { _id: true }
);

const serviceReportSchema = new Schema<IServiceReport>(
  {
    serviceReportNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    serviceDate: {
      type: Date,
      required: true
    },

    // Optional and changeable Delivery Challan reference
    deliveryChallan: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryChallan",
      default: null
    },

    status: {
      type: String,
      enum: ["Draft", "In Progress", "Completed", "Cancelled"],
      default: "Draft",
      required: true
    },

    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null
    },

    serviceEngineer: {
      type: String,
      required: true,
      trim: true
    },
    siteLocation: {
      type: String,
      trim: true
    },

    startTime: {
      type: String,
      trim: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/
    },
    endTime: {
      type: String,
      trim: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/
    },

    equipmentDetails: {
      type: [equipmentSchema],
      default: []
    },

    problemDescription: {
      type: String,
      trim: true
    },

    solutions: {
      type: [solutionSchema],
      default: []
    },

    materialsUsed: {
      type: [materialSchema],
      default: []
    },

    customerFeedback: {
      type: String,
      trim: true
    },

    customerRepresentativeName: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const ServiceReport = mongoose.model<IServiceReport>(
  "ServiceReport",
  serviceReportSchema
);

export default ServiceReport;
