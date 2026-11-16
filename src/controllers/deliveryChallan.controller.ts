
import { Request, Response } from "express";
import mongoose from "mongoose";

import DeliveryChallan from "../models/deliveryChallan.model";
import Customer from "../models/customer.model";
import Project from "../models/project.model";

// Fields that can be edited directly in the challan
const challanFields = [
  "challanNumber",
  "challanDate",
  "challanType",
  "status",
  "project",
  "poWorkOrderReference",
  "poDate",
  "responsiblePerson",
  "vehicleNumber",
  "transporterName",
  "ewayBillNumber",
  "deliverySiteLocation",
  "purposeOfDelivery",
  "items",
  "specialInstructions",
  "termsAndConditions"
] as const;

const customerSnapshotFields = [
  "customerGSTIN",
  "customerAddress",
  "state",
  "stateCode",
  "contactPerson",
  "contactNumber"
] as const;

// Build customer snapshot using Customer Master as the default.
// Explicit values from the challan request take priority.
const buildCustomerSnapshot = (customer: any, body: any) => ({
  customerGSTIN: body.customerGSTIN ?? customer.gstin ?? "",
  customerAddress:
    body.customerAddress ??
    customer.siteAddress ??
    customer.billingAddress ??
    "",
  state: body.state ?? customer.gstState ?? "",
  stateCode: body.stateCode ?? customer.stateCode ?? "",
  contactPerson: body.contactPerson ?? customer.contactPerson ?? "",
  contactNumber: body.contactNumber ?? customer.phoneNumber ?? ""
});

// Validate customer ID and ensure the customer exists and is active.
const getValidCustomer = async (customerId: string) => {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new Error("Invalid customer ID");
  }

  const customer = await Customer.findOne({
    _id: customerId,
    isActive: true
  });

  if (!customer) {
    throw new Error("Customer not found or inactive");
  }

  return customer;
};

// Validate project and ensure it belongs to the selected customer.
const validateProject = async (
  projectId: string | undefined,
  customerId: string
) => {
  if (!projectId) return;

  if (!mongoose.isValidObjectId(projectId)) {
    throw new Error("Invalid project ID");
  }

  const project = await Project.findById(projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  if (String(project.customer) !== String(customerId)) {
    throw new Error("Selected project does not belong to this customer");
  }
};

// CREATE DELIVERY CHALLAN
export const createDeliveryChallan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body;

    if (!body.customer) {
      res.status(400).json({
        success: false,
        message: "Customer is required"
      });
      return;
    }

    const customer = await getValidCustomer(body.customer);

    await validateProject(body.project, String(customer._id));

    const snapshot = buildCustomerSnapshot(customer, body);

    const challanData: Record<string, any> = {
      customer: customer._id,
      ...snapshot
    };

    for (const field of challanFields) {
      if (body[field] !== undefined) {
        challanData[field] = body[field];
      }
    }

    const challan = await DeliveryChallan.create(challanData);

    const result = await DeliveryChallan.findById(challan._id)
      .populate("customer", "customerCode customerLegalName")
      .populate("project", "projectCode projectName");

    res.status(201).json({
      success: true,
      message: "Delivery Challan created successfully",
      data: result
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Delivery Challan number already exists"
      });
      return;
    }

    if (
      error.message === "Invalid customer ID" ||
      error.message === "Customer not found or inactive" ||
      error.message === "Invalid project ID" ||
      error.message === "Project not found" ||
      error.message === "Selected project does not belong to this customer"
    ) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || "Failed to create Delivery Challan"
    });
  }
};

// GET ALL DELIVERY CHALLANS
export const getDeliveryChallans = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const challans = await DeliveryChallan.find()
      .populate("customer", "customerCode customerLegalName")
      .populate("project", "projectCode projectName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: challans.length,
      data: challans
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch Delivery Challans"
    });
  }
};

// GET DELIVERY CHALLAN BY ID
export const getDeliveryChallanById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Delivery Challan ID"
      });
      return;
    }

    const challan = await DeliveryChallan.findById(id)
      .populate("customer", "customerCode customerLegalName")
      .populate("project", "projectCode projectName");

    if (!challan) {
      res.status(404).json({
        success: false,
        message: "Delivery Challan not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: challan
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch Delivery Challan"
    });
  }
};

// UPDATE DELIVERY CHALLAN
export const updateDeliveryChallan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Delivery Challan ID"
      });
      return;
    }

    const existingChallan = await DeliveryChallan.findById(id);

    if (!existingChallan) {
      res.status(404).json({
        success: false,
        message: "Delivery Challan not found"
      });
      return;
    }

    if (
      existingChallan.status !== "Draft" &&
      existingChallan.status !== "Cancelled"
    ) {
      res.status(400).json({
        success: false,
        message: "Only Draft or Cancelled challans can be edited"
      });
      return;
    }

    const customerId = body.customer
      ? String(body.customer)
      : String(existingChallan.customer);

    let snapshot: Record<string, any> = {};

    // If customer changes, load a fresh snapshot.
    if (body.customer) {
      const customer = await getValidCustomer(customerId);
      snapshot = buildCustomerSnapshot(customer, body);
    }

    await validateProject(
      body.project !== undefined
        ? body.project
        : existingChallan.project
          ? String(existingChallan.project)
          : undefined,
      customerId
    );

    const updateData: Record<string, any> = {
      ...snapshot
    };

    for (const field of challanFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // If customer has not changed, allow editing snapshot fields
    // without fetching Customer Master again.
    if (!body.customer) {
      for (const field of customerSnapshotFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }
    }

    const updatedChallan = await DeliveryChallan.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .populate("customer", "customerCode customerLegalName")
      .populate("project", "projectCode projectName");

    res.status(200).json({
      success: true,
      message: "Delivery Challan updated successfully",
      data: updatedChallan
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Delivery Challan number already exists"
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || "Failed to update Delivery Challan"
    });
  }
};

// DELETE DELIVERY CHALLAN
export const deleteDeliveryChallan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Delivery Challan ID"
      });
      return;
    }

    const challan = await DeliveryChallan.findByIdAndDelete(id);

    if (!challan) {
      res.status(404).json({
        success: false,
        message: "Delivery Challan not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Delivery Challan permanently deleted successfully"
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete Delivery Challan"
    });
  }
};
