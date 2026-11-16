
import { Request, Response } from "express";
import mongoose from "mongoose";

import CustomerPayment, {
  PAYMENT_MODES,
} from "../models/customerPayment.model";
import InvoicePaymentBalance from "../models/invoicePaymentBalance.model";
import ServiceBill from "../models/serviceBill.model";

// CREATE CUSTOMER PAYMENT
export const createCustomerPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    const {
      receiptNumber,
      receiptDate,
      serviceBill,
      paymentAmount,
      paymentMode,
      transactionReference,
      depositedBank,
      receiptRemarks,
    } = req.body;

    if (
      !receiptNumber ||
      !receiptDate ||
      !serviceBill ||
      paymentAmount === undefined ||
      !paymentMode
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(serviceBill)) {
      res.status(400).json({
        success: false,
        message: "Invalid Service Bill ID",
      });
      return;
    }

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
      });
      return;
    }

    if (!PAYMENT_MODES.includes(paymentMode)) {
      res.status(400).json({
        success: false,
        message: "Invalid payment mode",
      });
      return;
    }

    if (Number.isNaN(Date.parse(receiptDate))) {
      res.status(400).json({
        success: false,
        message: "Invalid receipt date",
      });
      return;
    }

    let createdPayment: any;

    await session.withTransaction(async () => {
      const bill = await ServiceBill.findById(serviceBill).session(session);

      if (!bill) {
        throw new Error("SERVICE_BILL_NOT_FOUND");
      }

      if (bill.approvalStatus !== "Approved") {
        throw new Error("SERVICE_BILL_NOT_APPROVED");
      }

      const totalAmount = Number(bill.grandTotal);

      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        throw new Error("INVALID_INVOICE_AMOUNT");
      }

      // Create the balance tracker if this is the first payment.
      await InvoicePaymentBalance.updateOne(
        { serviceBill: bill._id },
        {
          $setOnInsert: {
            serviceBill: bill._id,
            totalAmount,
            paidAmount: 0,
          },
        },
        {
          upsert: true,
          session,
        }
      );

      // Atomically add the payment only if it does not exceed
      // the invoice total.
      const updatedBalance =
        await InvoicePaymentBalance.findOneAndUpdate(
          {
            serviceBill: bill._id,
            $expr: {
              $lte: [
                { $add: ["$paidAmount", amount] },
                "$totalAmount",
              ],
            },
          },
          {
            $inc: {
              paidAmount: amount,
            },
          },
          {
            new: true,
            session,
          }
        );

      if (!updatedBalance) {
        throw new Error("PAYMENT_EXCEEDS_OUTSTANDING");
      }

      const payments = await CustomerPayment.create(
        [
          {
            receiptNumber,
            receiptDate: new Date(receiptDate),
            serviceBill: bill._id,
            paymentAmount: amount,
            paymentMode,
            transactionReference,
            depositedBank,
            receiptRemarks,
          },
        ],
        { session }
      );

      createdPayment = payments[0];
    });

    const result = await CustomerPayment.findById(
      createdPayment._id
    ).populate("serviceBill");

    res.status(201).json({
      success: true,
      message: "Customer payment created successfully",
      data: result,
    });
  } catch (error: any) {
    if (error.message === "SERVICE_BILL_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Service Bill not found",
      });
      return;
    }

    if (error.message === "SERVICE_BILL_NOT_APPROVED") {
      res.status(400).json({
        success: false,
        message: "Only approved Service Bills can receive payments",
      });
      return;
    }

    if (error.message === "INVALID_INVOICE_AMOUNT") {
      res.status(400).json({
        success: false,
        message: "The invoice has an invalid grand total",
      });
      return;
    }

    if (error.message === "PAYMENT_EXCEEDS_OUTSTANDING") {
      res.status(400).json({
        success: false,
        message: "Payment amount exceeds the outstanding invoice balance",
      });
      return;
    }

    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Receipt number already exists",
      });
      return;
    }

    console.error("Create Customer Payment Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer payment",
    });
  } finally {
    await session.endSession();
  }
};

// GET ALL CUSTOMER PAYMENTS
export const getCustomerPayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const payments = await CustomerPayment.find()
      .populate("serviceBill")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Get Customer Payments Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer payments",
    });
  }
};

// GET CUSTOMER PAYMENT BY ID
export const getCustomerPaymentById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Customer Payment ID",
      });
      return;
    }

    const payment = await CustomerPayment.findById(id)
      .populate("serviceBill");

    if (!payment) {
      res.status(404).json({
        success: false,
        message: "Customer payment not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get Customer Payment Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer payment",
    });
  }
};

// GET OUTSTANDING INVOICES FOR DROPDOWN
export const getOutstandingInvoices = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const bills = await ServiceBill.find({
      approvalStatus: "Approved",
    })
      .populate("customer", "customerCode customerLegalName")
      .populate("project", "projectCode projectName")
      .sort({ invoiceDate: -1 });

    const outstandingInvoices = [];

    for (const bill of bills) {
      const balance = await InvoicePaymentBalance.findOne({
        serviceBill: bill._id,
      });

      let paidAmount = balance?.paidAmount ?? 0;

      // Fallback for invoices with existing receipts but no balance
      // tracker yet.
      if (!balance) {
        const result = await CustomerPayment.aggregate([
          {
            $match: {
              serviceBill: bill._id,
            },
          },
          {
            $group: {
              _id: null,
              totalPaid: { $sum: "$paymentAmount" },
            },
          },
        ]);

        paidAmount = result[0]?.totalPaid ?? 0;
      }

      const grandTotal = Number(bill.grandTotal);
      const outstandingAmount = Math.max(0, grandTotal - paidAmount);

      if (outstandingAmount > 0) {
        outstandingInvoices.push({
          _id: bill._id,
          invoiceNumber: bill.invoiceNumber,
          invoiceDate: bill.invoiceDate,
          customer: bill.customer,
          project: bill.project,
          grandTotal,
          paidAmount,
          outstandingAmount,
        });
      }
    }

    res.status(200).json({
      success: true,
      count: outstandingInvoices.length,
      data: outstandingInvoices,
    });
  } catch (error) {
    console.error("Get Outstanding Invoices Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch outstanding invoices",
    });
  }
};



export const updateCustomerPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Customer Payment ID",
      });
      return;
    }

    const {
      receiptDate,
      paymentAmount,
      paymentMode,
      transactionReference,
      depositedBank,
      receiptRemarks,
    } = req.body;

    if (
      paymentAmount === undefined &&
      receiptDate === undefined &&
      paymentMode === undefined &&
      transactionReference === undefined &&
      depositedBank === undefined &&
      receiptRemarks === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
      return;
    }

    if (
      paymentAmount !== undefined &&
      (!Number.isFinite(Number(paymentAmount)) ||
        Number(paymentAmount) <= 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
      });
      return;
    }

    if (
      paymentMode !== undefined &&
      !PAYMENT_MODES.includes(paymentMode)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid payment mode",
      });
      return;
    }

    if (
      receiptDate !== undefined &&
      Number.isNaN(Date.parse(receiptDate))
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid receipt date",
      });
      return;
    }

    let updatedPayment: any;

    await session.withTransaction(async () => {
      const payment = await CustomerPayment.findById(id).session(session);

      if (!payment) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      // The invoice reference cannot be changed through this update.
      const bill = await ServiceBill.findById(
        payment.serviceBill
      ).session(session);

      if (!bill) {
        throw new Error("SERVICE_BILL_NOT_FOUND");
      }

      const totalAmount = Number(bill.grandTotal);

      // Calculate existing total payments for legacy receipts.
      const existingPayments = await CustomerPayment.aggregate([
        {
          $match: {
            serviceBill: payment.serviceBill,
          },
        },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: "$paymentAmount" },
          },
        },
      ]).session(session);

      const alreadyPaid = existingPayments[0]?.totalPaid ?? 0;

      // Create balance tracker if it does not exist.
      await InvoicePaymentBalance.updateOne(
        { serviceBill: payment.serviceBill },
        {
          $setOnInsert: {
            serviceBill: payment.serviceBill,
            totalAmount,
            paidAmount: alreadyPaid,
          },
        },
        {
          upsert: true,
          session,
        }
      );

      const balance = await InvoicePaymentBalance.findOne({
        serviceBill: payment.serviceBill,
      }).session(session);

      if (!balance) {
        throw new Error("PAYMENT_BALANCE_NOT_FOUND");
      }

      if (Math.abs(balance.totalAmount - totalAmount) > 0.001) {
        throw new Error("INVOICE_TOTAL_CHANGED");
      }

      const oldAmount = payment.paymentAmount;
      const newAmount =
        paymentAmount !== undefined
          ? Number(paymentAmount)
          : oldAmount;

      const difference = newAmount - oldAmount;

      // Adjust balance only if the payment amount changed.
      if (difference !== 0) {
        const updatedBalance =
          await InvoicePaymentBalance.findOneAndUpdate(
            {
              serviceBill: payment.serviceBill,
              $expr: {
                $and: [
                  {
                    $gte: [
                      { $add: ["$paidAmount", difference] },
                      0,
                    ],
                  },
                  {
                    $lte: [
                      { $add: ["$paidAmount", difference] },
                      "$totalAmount",
                    ],
                  },
                ],
              },
            },
            {
              $inc: {
                paidAmount: difference,
              },
            },
            {
              new: true,
              session,
            }
          );

        if (!updatedBalance) {
          throw new Error("PAYMENT_EXCEEDS_OUTSTANDING");
        }
      }

      if (receiptDate !== undefined) {
        payment.receiptDate = new Date(receiptDate);
      }

      if (paymentAmount !== undefined) {
        payment.paymentAmount = newAmount;
      }

      if (paymentMode !== undefined) {
        payment.paymentMode = paymentMode;
      }

      if (transactionReference !== undefined) {
        payment.transactionReference = transactionReference;
      }

      if (depositedBank !== undefined) {
        payment.depositedBank = depositedBank;
      }

      if (receiptRemarks !== undefined) {
        payment.receiptRemarks = receiptRemarks;
      }

      await payment.save({ session });

      updatedPayment = payment;
    });

    const result = await CustomerPayment.findById(
      updatedPayment._id
    ).populate("serviceBill");

    res.status(200).json({
      success: true,
      message: "Customer payment updated successfully",
      data: result,
    });
  } catch (error: any) {
    if (error.message === "PAYMENT_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Customer payment not found",
      });
      return;
    }

    if (error.message === "SERVICE_BILL_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Service Bill not found",
      });
      return;
    }

    if (error.message === "PAYMENT_BALANCE_NOT_FOUND") {
      res.status(500).json({
        success: false,
        message: "Invoice payment balance not found",
      });
      return;
    }

    if (error.message === "INVOICE_TOTAL_CHANGED") {
      res.status(409).json({
        success: false,
        message: "Invoice total changed. Reconciliation is required.",
      });
      return;
    }

    if (error.message === "PAYMENT_EXCEEDS_OUTSTANDING") {
      res.status(400).json({
        success: false,
        message: "Updated payment exceeds the outstanding invoice balance",
      });
      return;
    }

    console.error("Update Customer Payment Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer payment",
    });
  } finally {
    await session.endSession();
  }
};
