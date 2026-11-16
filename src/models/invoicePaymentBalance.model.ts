
import mongoose, { Document, Schema } from "mongoose";

export interface IInvoicePaymentBalance extends Document {
  serviceBill: mongoose.Types.ObjectId;
  totalAmount: number;
  paidAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const invoicePaymentBalanceSchema =
  new Schema<IInvoicePaymentBalance>(
    {
      serviceBill: {
        type: Schema.Types.ObjectId,
        ref: "ServiceBill",
        required: true,
        unique: true,
      },
      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      paidAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    {
      timestamps: true,
    }
  );

const InvoicePaymentBalance =
  mongoose.model<IInvoicePaymentBalance>(
    "InvoicePaymentBalance",
    invoicePaymentBalanceSchema
  );

export default InvoicePaymentBalance;
