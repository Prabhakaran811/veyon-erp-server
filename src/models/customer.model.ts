
import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  customerCode: string;
  customerLegalName: string;
  gstin?: string;
  gstState?: string;
  stateCode?: string;
  billingAddress?: string;
  siteAddress?: string;
  contactPerson?: string;
  phoneNumber?: string;
  emailAddress?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    customerCode: {
      type: String,
      required: [true, "Customer code is required"],
      unique: true,
      trim: true,
      uppercase: true
    },

    customerLegalName: {
      type: String,
      required: [true, "Customer legal name is required"],
      trim: true
    },

    gstin: {
      type: String,
      trim: true,
      uppercase: true
    },

    gstState: {
      type: String,
      trim: true
    },

    stateCode: {
      type: String,
      trim: true
    },

    billingAddress: {
      type: String,
      trim: true
    },

    siteAddress: {
      type: String,
      trim: true
    },

    contactPerson: {
      type: String,
      trim: true
    },

    phoneNumber: {
      type: String,
      trim: true
    },

    emailAddress: {
      type: String,
      trim: true,
      lowercase: true
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);


const Customer = mongoose.model<ICustomer>(
  "Customer",
  customerSchema
);

export default Customer;
