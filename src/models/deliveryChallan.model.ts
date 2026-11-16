
import mongoose, { Schema, Document } from "mongoose";

export type ChallanType =
  | "Material Out"
  | "Material In"
  | "Returnable"
  | "Non-Returnable";

export type ChallanStatus =
  | "Draft"
  | "Issued"
  | "Dispatched"
  | "Delivered"
  | "Cancelled";

export interface IDeliveryChallanItem {
  itemDescription: string;
  partNumber?: string;
  hsnSac?: string;
  quantity: number;
  unit: string;
  serialNumberOrTag?: string;
  remarks?: string;
}

export interface IDeliveryChallan extends Document {
  challanNumber: string;
  challanDate: Date;
  challanType: ChallanType;
  status: ChallanStatus;

  customer: mongoose.Types.ObjectId;
  customerGSTIN?: string;
  customerAddress?: string;
  state?: string;
  stateCode?: string;
  contactPerson?: string;
  contactNumber?: string;

  project?: mongoose.Types.ObjectId;
  poWorkOrderReference?: string;
  poDate?: Date;

  responsiblePerson?: string;
  vehicleNumber?: string;
  transporterName?: string;
  ewayBillNumber?: string;
  deliverySiteLocation?: string;
  purposeOfDelivery?: string;

  items: IDeliveryChallanItem[];

  specialInstructions?: string;
  termsAndConditions?: string;

  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<IDeliveryChallanItem>(
  {
    itemDescription: {
      type: String,
      required: true,
      trim: true
    },
    partNumber: {
      type: String,
      trim: true
    },
    hsnSac: {
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
    serialNumberOrTag: {
      type: String,
      trim: true
    },
    remarks: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

const deliveryChallanSchema = new Schema<IDeliveryChallan>(
  {
    challanNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    challanDate: {
      type: Date,
      required: true
    },
    challanType: {
      type: String,
      enum: [
        "Material Out",
        "Material In",
        "Returnable",
        "Non-Returnable"
      ],
      required: true
    },
    status: {
      type: String,
      enum: [
        "Draft",
        "Issued",
        "Dispatched",
        "Delivered",
        "Cancelled"
      ],
      default: "Draft"
    },

    // Customer reference + independent snapshot
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    customerGSTIN: { type: String, trim: true },
    customerAddress: { type: String, trim: true },
    state: { type: String, trim: true },
    stateCode: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    contactNumber: { type: String, trim: true },

    project: {
      type: Schema.Types.ObjectId,
      ref: "Project"
    },
    poWorkOrderReference: { type: String, trim: true },
    poDate: { type: Date },

    responsiblePerson: { type: String, trim: true },
    vehicleNumber: { type: String, trim: true, uppercase: true },
    transporterName: { type: String, trim: true },
    ewayBillNumber: { type: String, trim: true },
    deliverySiteLocation: { type: String, trim: true },
    purposeOfDelivery: { type: String, trim: true },

    items: {
      type: [itemSchema],
      required: true,
      validate: {
        validator: (items: IDeliveryChallanItem[]) =>
          Array.isArray(items) && items.length > 0,
        message: "At least one item is required"
      }
    },

    specialInstructions: { type: String, trim: true },
    termsAndConditions: { type: String, trim: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const DeliveryChallan = mongoose.model<IDeliveryChallan>(
  "DeliveryChallan",
  deliveryChallanSchema
);

export default DeliveryChallan;
