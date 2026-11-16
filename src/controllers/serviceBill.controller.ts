
import { Request, Response } from "express";
import mongoose from "mongoose";

import ServiceBill from "../models/serviceBill.model";
import Customer from "../models/customer.model";
import Project from "../models/project.model";
import DeliveryChallan from "../models/deliveryChallan.model";
import ServiceReport from "../models/serviceReport.model";

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const getChallan = async (id: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error("Invalid Delivery Challan ID");
  }

  const challan = await DeliveryChallan.findById(id);

  if (!challan) {
    throw new Error("Delivery Challan not found");
  }

  return challan;
};

const getServiceReport = async (id: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error("Invalid Service Report ID");
  }

  const report = await ServiceReport.findById(id);

  if (!report) {
    throw new Error("Service Report not found");
  }

  return report;
};

const getCustomer = async (id: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error("Invalid Customer ID");
  }

  const customer = await Customer.findById(id);

  if (!customer) {
    throw new Error("Customer not found");
  }

  return customer;
};

const validateProject = async (
  projectId: string | null | undefined,
  customerId: string
) => {
  if (!projectId) return;

  if (!mongoose.isValidObjectId(projectId)) {
    throw new Error("Invalid Project ID");
  }

  const project = await Project.findById(projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  if (String(project.customer) !== String(customerId)) {
    throw new Error("Selected Project does not belong to this Customer");
  }
};

// Calculate every item amount and invoice total on the server.
const calculateBill = (body: any) => {
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error("At least one service item is required");
  }

  const items = body.items.map((item: any) => {
    const quantity = Number(item.quantity);
    const rate = Number(item.rate);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Each item must have a quantity greater than zero");
    }

    if (!Number.isFinite(rate) || rate < 0) {
      throw new Error("Each item must have a valid rate");
    }

    if (!item.serviceDescription || !item.unit) {
      throw new Error("Service Description and Unit are required for every item");
    }

    return {
      serviceDescription: item.serviceDescription,
      sacCode: item.sacCode,
      quantity,
      unit: item.unit,
      rate,
      amount: round2(quantity * rate)
    };
  });

  const subtotal = round2(
    items.reduce((total: number, item: any) => total + item.amount, 0)
  );

  const discount = Number(body.discount ?? 0);
  const gstRate = Number(body.gstRate ?? 0);

  if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
    throw new Error("Discount must be between zero and the subtotal");
  }

  if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
    throw new Error("GST Rate must be between 0 and 100");
  }

  const taxableValue = round2(subtotal - discount);

  // This calculation assumes an intra-state supply.
  const cgst = round2(taxableValue * (gstRate / 2) / 100);
  const sgst = round2(taxableValue * (gstRate / 2) / 100);
  const grandTotal = round2(taxableValue + cgst + sgst);

  return {
    items,
    subtotal,
    discount: round2(discount),
    taxableValue,
    gstRate,
    cgst,
    sgst,
    grandTotal
  };
};

const populateServiceBill = (id: string | mongoose.Types.ObjectId) =>
  ServiceBill.findById(id)
    .populate("deliveryChallan", "challanNumber challanDate status")
    .populate("serviceReport", "serviceReportNumber serviceDate status")
    .populate("customer", "customerCode customerLegalName gstin")
    .populate("project", "projectCode projectName");

// CREATE SERVICE BILL
export const createServiceBill = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body;

    let challan: any = null;
    let report: any = null;

    if (body.deliveryChallan) {
      challan = await getChallan(String(body.deliveryChallan));
    }

    if (body.serviceReport) {
      report = await getServiceReport(String(body.serviceReport));
    }

    // Explicit Customer wins; otherwise use Challan, then Service Report.
    const customerId = body.customer
      ? String(body.customer)
      : challan
        ? String(challan.customer)
        : report
          ? String(report.customer)
          : "";

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: "Customer is required. Select a Customer or a reference record."
      });
      return;
    }

    await getCustomer(customerId);

    // Explicit Project wins; otherwise use Challan, then Service Report.
    const projectId = body.project !== undefined
      ? body.project
      : challan?.project
        ? String(challan.project)
        : report?.project
          ? String(report.project)
          : null;

    await validateProject(projectId, customerId);

    const financials = calculateBill(body);

    const bill = await ServiceBill.create({
      invoiceNumber: body.invoiceNumber,
      invoiceDate: body.invoiceDate,
      paymentDueDate: body.paymentDueDate,
      approvalStatus: body.approvalStatus ?? "Draft",

      deliveryChallan: challan?._id ?? null,
      serviceReport: report?._id ?? null,

      servicePeriod: body.servicePeriod,

      customer: customerId,
      project: projectId,

      serviceDescriptionSummary: body.serviceDescriptionSummary,
      termsAndConditions: body.termsAndConditions,

      ...financials
    });

    const result = await populateServiceBill(bill._id);

    res.status(201).json({
      success: true,
      message: "Service Bill created successfully",
      data: result
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Invoice Number already exists"
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || "Failed to create Service Bill"
    });
  }
};

// GET ALL SERVICE BILLS
export const getServiceBills = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const bills = await ServiceBill.find()
      .populate("deliveryChallan", "challanNumber challanDate status")
      .populate("serviceReport", "serviceReportNumber serviceDate status")
      .populate("customer", "customerCode customerLegalName")
      .populate("project", "projectCode projectName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch Service Bills"
    });
  }
};

// GET SERVICE BILL BY ID
export const getServiceBillById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Service Bill ID"
      });
      return;
    }

    const bill = await populateServiceBill(id);

    if (!bill) {
      res.status(404).json({
        success: false,
        message: "Service Bill not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: bill
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch Service Bill"
    });
  }
};

// UPDATE SERVICE BILL
export const updateServiceBill = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const body = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Service Bill ID"
      });
      return;
    }

    const existingBill = await ServiceBill.findById(id);

    if (!existingBill) {
      res.status(404).json({
        success: false,
        message: "Service Bill not found"
      });
      return;
    }

    if (existingBill.approvalStatus !== "Draft") {
      res.status(400).json({
        success: false,
        message: "Only Draft Service Bills can be edited"
      });
      return;
    }

    const hasChallanChange = Object.prototype.hasOwnProperty.call(
      body,
      "deliveryChallan"
    );

    const hasReportChange = Object.prototype.hasOwnProperty.call(
      body,
      "serviceReport"
    );

    let challan: any = null;
    let report: any = null;

    if (hasChallanChange && body.deliveryChallan) {
      challan = await getChallan(String(body.deliveryChallan));
    } else if (!hasChallanChange && existingBill.deliveryChallan) {
      challan = await DeliveryChallan.findById(existingBill.deliveryChallan);
    }

    if (hasReportChange && body.serviceReport) {
      report = await getServiceReport(String(body.serviceReport));
    } else if (!hasReportChange && existingBill.serviceReport) {
      report = await ServiceReport.findById(existingBill.serviceReport);
    }

    const customerId = body.customer !== undefined
      ? String(body.customer)
      : hasChallanChange && challan
        ? String(challan.customer)
        : hasReportChange && report
          ? String(report.customer)
          : String(existingBill.customer);

    await getCustomer(customerId);

    const projectId = body.project !== undefined
      ? body.project
      : hasChallanChange && challan
        ? challan.project ? String(challan.project) : null
        : hasReportChange && report
          ? report.project ? String(report.project) : null
          : existingBill.project ? String(existingBill.project) : null;

    await validateProject(projectId, customerId);

    const mergedItems = body.items !== undefined
      ? body.items
      : existingBill.items.map((item: any) => ({
          serviceDescription: item.serviceDescription,
          sacCode: item.sacCode,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate
        }));

    const financials = calculateBill({
      items: mergedItems,
      discount: body.discount ?? existingBill.discount,
      gstRate: body.gstRate ?? existingBill.gstRate
    });

    const updateData: Record<string, any> = {
      customer: customerId,
      project: projectId,
      ...financials
    };

    const editableFields = [
      "invoiceNumber",
      "invoiceDate",
      "paymentDueDate",
      "approvalStatus",
      "servicePeriod",
      "serviceDescriptionSummary",
      "termsAndConditions"
    ];

    for (const field of editableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (hasChallanChange) {
      updateData.deliveryChallan = challan?._id ?? null;
    }

    if (hasReportChange) {
      updateData.serviceReport = report?._id ?? null;
    }

    const updatedBill = await ServiceBill.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .populate("deliveryChallan", "challanNumber challanDate status")
      .populate("serviceReport", "serviceReportNumber serviceDate status")
      .populate("customer", "customerCode customerLegalName")
      .populate("project", "projectCode projectName");

    res.status(200).json({
      success: true,
      message: "Service Bill updated successfully",
      data: updatedBill
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Invoice Number already exists"
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || "Failed to update Service Bill"
    });
  }
};

// DELETE SERVICE BILL
export const deleteServiceBill = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Service Bill ID"
      });
      return;
    }

    const bill = await ServiceBill.findByIdAndDelete(id);

    if (!bill) {
      res.status(404).json({
        success: false,
        message: "Service Bill not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Service Bill permanently deleted successfully"
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete Service Bill"
    });
  }
};
