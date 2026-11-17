
import { Request, Response } from "express";
import mongoose from "mongoose";

import Employee from "../models/employee.model";

const employeeFields = [
  "employeeCode",
  "employeeName",
  "gender",
  "dateOfBirth",
  "phoneNumber",
  "emailAddress",
  "address",
  "emergencyContactName",
  "emergencyContactNumber",
  "department",
  "designation",
  "employeeType",
  "joiningDate",
  "reportingManager",
  "employmentStatus"
] as const;

// Validate reporting manager
const validateReportingManager = async (
  managerId: string | null | undefined,
  employeeId?: string
) => {
  if (managerId === null || managerId === undefined || managerId === "") {
    return;
  }

  if (!mongoose.isValidObjectId(managerId)) {
    throw new Error("Invalid reporting manager ID");
  }

  if (employeeId && String(managerId) === employeeId) {
    throw new Error("An employee cannot report to themselves");
  }

  const manager = await Employee.findById(managerId);

  if (!manager) {
    throw new Error("Reporting manager not found");
  }

  if (manager.employmentStatus !== "Active") {
    throw new Error("Reporting manager is not active");
  }
};

// CREATE EMPLOYEE
export const createEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body;

    if (
      !body.employeeCode ||
      !body.employeeName ||
      !body.phoneNumber ||
      !body.department ||
      !body.designation ||
      !body.joiningDate
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide all required employee fields"
      });
      return;
    }

    if (body.reportingManager) {
      await validateReportingManager(body.reportingManager);
    }

    const employeeData: Record<string, any> = {};

    for (const field of employeeFields) {
      if (body[field] !== undefined) {
        employeeData[field] = body[field];
      }
    }

    if (employeeData.emailAddress === "") {
      delete employeeData.emailAddress;
    }

    const employee = await Employee.create(employeeData);

    const result = await Employee.findById(employee._id)
      .populate("reportingManager", "employeeCode employeeName designation");

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: result
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Employee Code already exists"
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || "Failed to create employee"
    });
  }
};

// GET ALL EMPLOYEES
export const getEmployees = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const employees = await Employee.find()
      .populate(
        "reportingManager",
        "employeeCode employeeName designation"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch employees"
    });
  }
};

// GET EMPLOYEE BY ID
export const getEmployeeById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Employee ID"
      });
      return;
    }

    const employee = await Employee.findById(id)
      .populate(
        "reportingManager",
        "employeeCode employeeName designation"
      );

    if (!employee) {
      res.status(404).json({
        success: false,
        message: "Employee not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch employee"
    });
  }
};

// UPDATE EMPLOYEE
export const updateEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const body = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Employee ID"
      });
      return;
    }

    const existingEmployee = await Employee.findById(id);

    if (!existingEmployee) {
      res.status(404).json({
        success: false,
        message: "Employee not found"
      });
      return;
    }

    if (body.reportingManager !== undefined) {
      await validateReportingManager(body.reportingManager, id);
    }

    const updateData: Record<string, any> = {};

    for (const field of employeeFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (updateData.emailAddress === "") {
      updateData.emailAddress = undefined;
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate(
      "reportingManager",
      "employeeCode employeeName designation"
    );

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: updatedEmployee
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Employee Code already exists"
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || "Failed to update employee"
    });
  }
};

// DELETE EMPLOYEE PERMANENTLY
export const deleteEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Employee ID"
      });
      return;
    }

    const employee = await Employee.findByIdAndDelete(id);

    if (!employee) {
      res.status(404).json({
        success: false,
        message: "Employee not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Employee permanently deleted successfully",
      data: employee
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete employee"
    });
  }
};
