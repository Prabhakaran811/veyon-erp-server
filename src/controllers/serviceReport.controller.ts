
import { Request, Response } from "express";
import mongoose from "mongoose";

import ServiceReport from "../models/serviceReport.model";
import Customer from "../models/customer.model";
import Project from "../models/project.model";
import DeliveryChallan from "../models/deliveryChallan.model";

// Validate and retrieve a Delivery Challan
const getDeliveryChallan = async (id: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error("Invalid Delivery Challan ID");
  }

  const challan = await DeliveryChallan.findById(id);

  if (!challan) {
    throw new Error("Delivery Challan not found");
  }

  return challan;
};

// Validate Customer
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

// Validate Project and ensure it belongs to the selected Customer
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

// Return populated response
const populateServiceReport = (id: mongoose.Types.ObjectId | string) =>
  ServiceReport.findById(id)
    .populate("deliveryChallan", "challanNumber challanDate status")
    .populate("customer", "customerCode customerLegalName")
    .populate("project", "projectCode projectName");

// CREATE SERVICE REPORT
export const createServiceReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body;

    let challan: any = null;

    // Load Delivery Challan when selected
    if (body.deliveryChallan) {
      challan = await getDeliveryChallan(body.deliveryChallan);
    }

    // Use explicitly selected Customer first.
    // Otherwise, derive Customer from the Delivery Challan.
    const customerId = body.customer
      ? String(body.customer)
      : challan
        ? String(challan.customer)
        : "";

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: "Customer is required. Select a Customer or a Delivery Challan."
      });
      return;
    }

    await getCustomer(customerId);

    // Use explicitly selected Project first.
    // Otherwise, derive Project from the Delivery Challan.
    const projectId = body.project !== undefined
      ? body.project
      : challan?.project
        ? String(challan.project)
        : null;

    await validateProject(projectId, customerId);

    const serviceReport = await ServiceReport.create({
      serviceReportNumber: body.serviceReportNumber,
      serviceDate: body.serviceDate,

      deliveryChallan: challan ? challan._id : null,
      status: body.status,

      customer: customerId,
      project: projectId,

      serviceEngineer: body.serviceEngineer,
      siteLocation:
        body.siteLocation ??
        challan?.deliverySiteLocation ??
        "",

      startTime: body.startTime,
      endTime: body.endTime,

      equipmentDetails: body.equipmentDetails ?? [],
      problemDescription: body.problemDescription,
      solutions: body.solutions ?? [],
      materialsUsed: body.materialsUsed ?? [],

      customerFeedback: body.customerFeedback,
      customerRepresentativeName: body.customerRepresentativeName
    });

    const result = await populateServiceReport(serviceReport._id);

    res.status(201).json({
      success: true,
      message: "Service Report created successfully",
      data: result
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Service Report number already exists"
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || "Failed to create Service Report"
    });
  }
};

// GET ALL SERVICE REPORTS
export const getServiceReports = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const reports = await ServiceReport.find()
      .populate("deliveryChallan", "challanNumber challanDate status")
      .populate("customer", "customerCode customerLegalName")
      .populate("project", "projectCode projectName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch Service Reports"
    });
  }
};

// GET SERVICE REPORT BY ID
export const getServiceReportById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Service Report ID"
      });
      return;
    }

    const report = await populateServiceReport(id);

    if (!report) {
      res.status(404).json({
        success: false,
        message: "Service Report not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch Service Report"
    });
  }
};

// UPDATE SERVICE REPORT
export const updateServiceReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const body = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Service Report ID"
      });
      return;
    }

    const existingReport = await ServiceReport.findById(id);

    if (!existingReport) {
      res.status(404).json({
        success: false,
        message: "Service Report not found"
      });
      return;
    }

    // Only Draft and In Progress reports are editable.
    if (
      existingReport.status !== "Draft" &&
      existingReport.status !== "In Progress"
    ) {
      res.status(400).json({
        success: false,
        message: "Only Draft or In Progress reports can be edited"
      });
      return;
    }

    const hasChallanChange = Object.prototype.hasOwnProperty.call(
      body,
      "deliveryChallan"
    );

    let challan: any = null;

    if (hasChallanChange && body.deliveryChallan) {
      challan = await getDeliveryChallan(body.deliveryChallan);
    } else if (!hasChallanChange && existingReport.deliveryChallan) {
      challan = await DeliveryChallan.findById(
        existingReport.deliveryChallan
      );
    }

    // Explicit Customer wins. Otherwise, use the selected challan
    // when the link changes, or retain the existing Customer.
    const customerId = body.customer !== undefined
      ? String(body.customer)
      : hasChallanChange
        ? challan
          ? String(challan.customer)
          : String(existingReport.customer)
        : String(existingReport.customer);

    await getCustomer(customerId);

    // Explicit Project wins. Otherwise, when changing the challan,
    // use its Project if available. If unlinking, retain the current Project.
    const projectId = body.project !== undefined
      ? body.project
      : hasChallanChange && challan
        ? challan.project
          ? String(challan.project)
          : null
        : existingReport.project
          ? String(existingReport.project)
          : null;

    await validateProject(projectId, customerId);

    const updateData: Record<string, any> = {};

    const editableFields = [
      "serviceReportNumber",
      "serviceDate",
      "status",
      "serviceEngineer",
      "startTime",
      "endTime",
      "equipmentDetails",
      "problemDescription",
      "solutions",
      "materialsUsed",
      "customerFeedback",
      "customerRepresentativeName"
    ];

    for (const field of editableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    updateData.customer = customerId;
    updateData.project = projectId;

    // Only change the reference when the request explicitly includes it.
    if (hasChallanChange) {
      updateData.deliveryChallan = challan ? challan._id : null;
    }

    // Prefill site location when the Delivery Challan link changes.
    // An explicitly supplied siteLocation takes priority.
    if (body.siteLocation !== undefined) {
      updateData.siteLocation = body.siteLocation;
    } else if (hasChallanChange && challan) {
      updateData.siteLocation = challan.deliverySiteLocation ?? "";
    }

    const updatedReport = await ServiceReport.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .populate("deliveryChallan", "challanNumber challanDate status")
      .populate("customer", "customerCode customerLegalName")
      .populate("project", "projectCode projectName");

    res.status(200).json({
      success: true,
      message: "Service Report updated successfully",
      data: updatedReport
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Service Report number already exists"
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || "Failed to update Service Report"
    });
  }
};

// DELETE SERVICE REPORT
export const deleteServiceReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Service Report ID"
      });
      return;
    }

    const report = await ServiceReport.findByIdAndDelete(id);

    if (!report) {
      res.status(404).json({
        success: false,
        message: "Service Report not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Service Report permanently deleted successfully"
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete Service Report"
    });
  }
};
