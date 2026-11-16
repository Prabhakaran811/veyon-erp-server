
import mongoose, { Schema, Document } from "mongoose";

export type ApprovalStatus =
  | "Draft"
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cancelled";

export interface IServiceBillItem {
  serviceDescription: string;
  sacCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface IServiceBill extends Document {
  invoiceNumber: string;
  invoiceDate: Date;
  paymentDueDate?: Date;
  approvalStatus: ApprovalStatus;

  deliveryChallan?: mongoose.Types.ObjectId | null;
  serviceReport?: mongoose.Types.ObjectId | null;

  servicePeriod?: {
    fromDate?: Date;
    toDate?: Date;
  };

  customer: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId | null;

  items: IServiceBillItem[];
  serviceDescriptionSummary?: string;
  termsAndConditions?: string;

  subtotal: number;
  discount: number;
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  grandTotal: number;

  createdAt: Date;
  updatedAt: Date;
}

const serviceBillItemSchema = new Schema<IServiceBillItem>(
  {
    serviceDescription: {
      type: String,
      required: true,
      trim: true
    },
    sacCode: {
      type: String,
      trim: true
    },
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
    rate: {
      type: Number,
      required: true,
      min: 0
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: true }
);

const serviceBillSchema = new Schema<IServiceBill>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    invoiceDate: {
      type: Date,
      required: true
    },
    paymentDueDate: {
      type: Date
    },
    approvalStatus: {
      type: String,
      enum: ["Draft", "Pending", "Approved", "Rejected", "Cancelled"],
      default: "Draft",
      required: true
    },

    deliveryChallan: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryChallan",
      default: null
    },
    serviceReport: {
      type: Schema.Types.ObjectId,
      ref: "ServiceReport",
      default: null
    },

    servicePeriod: {
      fromDate: Date,
      toDate: Date
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

    items: {
      type: [serviceBillItemSchema],
      required: true,
      validate: {
        validator: (items: IServiceBillItem[]) =>
          Array.isArray(items) && items.length > 0,
        message: "At least one service item is required"
      }
    },

    serviceDescriptionSummary: {
      type: String,
      trim: true
    },
    termsAndConditions: {
      type: String,
      trim: true
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    taxableValue: {
      type: Number,
      required: true,
      min: 0
    },
    gstRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    cgst: {
      type: Number,
      required: true,
      min: 0
    },
    sgst: {
      type: Number,
      required: true,
      min: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const ServiceBill = mongoose.model<IServiceBill>(
  "ServiceBill",
  serviceBillSchema
);

export default ServiceBill;
