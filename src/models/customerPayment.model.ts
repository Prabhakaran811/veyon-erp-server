
import mongoose, { Document, Schema } from "mongoose";

export const PAYMENT_MODES = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Card",
  "Other",
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface ICustomerPayment extends Document {
  receiptNumber: string;
  receiptDate: Date;
  serviceBill: mongoose.Types.ObjectId;
  paymentAmount: number;
  paymentMode: PaymentMode;
  transactionReference?: string;
  depositedBank?: string;
  receiptRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerPaymentSchema = new Schema<ICustomerPayment>(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    receiptDate: {
      type: Date,
      required: true,
    },
    serviceBill: {
      type: Schema.Types.ObjectId,
      ref: "ServiceBill",
      required: true,
    },
    paymentAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMode: {
      type: String,
      enum: PAYMENT_MODES,
      required: true,
    },
    transactionReference: {
      type: String,
      trim: true,
    },
    depositedBank: {
      type: String,
      trim: true,
    },
    receiptRemarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const CustomerPayment = mongoose.model<ICustomerPayment>(
  "CustomerPayment",
  customerPaymentSchema
);

export default CustomerPayment;
