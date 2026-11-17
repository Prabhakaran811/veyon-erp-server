
import { Request, Response } from "express";
import mongoose from "mongoose";
import EmployeeLeave from "../models/employeeLeave.model";
import Employee from "../models/employee.model";

// 0 = Sunday, 6 = Saturday.
// Default: Sunday is the weekly off.
const WEEKLY_OFF_DAYS = [0];

const isValidDateString = (value: unknown): value is string => {
  if (typeof value !== "string") return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const parseDate = (value: string): Date =>
  new Date(`${value}T00:00:00.000Z`);

const isWorkingDay = (date: Date): boolean =>
  !WEEKLY_OFF_DAYS.includes(date.getUTCDay());

const calculateWorkingDays = (
  fromDate: Date,
  toDate: Date,
  duration: "Full Day" | "Half Day"
): number => {
  if (duration === "Half Day") {
    return isWorkingDay(fromDate) ? 0.5 : 0;
  }

  let totalDays = 0;

  const current = new Date(fromDate);

  while (current <= toDate) {
    if (isWorkingDay(current)) {
      totalDays += 1;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return totalDays;
};

const validateEmployee = async (employeeId: string) => {
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return null;
  }

  return Employee.findById(employeeId);
};

// Check whether an employee already has a leave record
// that overlaps the requested date range.
const hasOverlappingLeave = async (
  employeeId: string,
  fromDate: Date,
  toDate: Date,
  excludeId?: string
) => {
  const filter: Record<string, unknown> = {
    employee: employeeId,
    fromDate: { $lte: toDate },
    toDate: { $gte: fromDate },
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return EmployeeLeave.exists(filter);
};

// CREATE EMPLOYEE LEAVE
export const createEmployeeLeave = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      employee,
      leaveType,
      fromDate: fromDateInput,
      toDate: toDateInput,
      duration = "Full Day",
      reason,
      remarks,
      recordedBy,
    } = req.body;

    if (
      !employee ||
      !leaveType ||
      !fromDateInput ||
      !toDateInput
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Employee, leave type, from date and to date are required.",
      });
    }

    if (
      !isValidDateString(fromDateInput) ||
      !isValidDateString(toDateInput)
    ) {
      return res.status(400).json({
        success: false,
        message: "Dates must use YYYY-MM-DD format.",
      });
    }

    if (!["Full Day", "Half Day"].includes(duration)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave duration.",
      });
    }

    const fromDate = parseDate(fromDateInput);
    const toDate = parseDate(toDateInput);

    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be after to date.",
      });
    }

    if (
      duration === "Half Day" &&
      fromDateInput !== toDateInput
    ) {
      return res.status(400).json({
        success: false,
        message: "Half-day leave must be for a single date.",
      });
    }

    const validLeaveTypes = [
      "Casual Leave",
      "Sick Leave",
      "Earned Leave",
      "Unpaid Leave",
      "Other",
    ];

    if (!validLeaveTypes.includes(leaveType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave type.",
      });
    }

    const employeeExists = await validateEmployee(employee);

    if (!employeeExists) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const totalDays = calculateWorkingDays(
      fromDate,
      toDate,
      duration
    );

    if (totalDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Selected dates contain no working days.",
      });
    }

    const overlapping = await hasOverlappingLeave(
      employee,
      fromDate,
      toDate
    );

    if (overlapping) {
      return res.status(409).json({
        success: false,
        message:
          "This employee already has a leave record for an overlapping date.",
      });
    }

    const leave = await EmployeeLeave.create({
      employee,
      leaveType,
      fromDate,
      toDate,
      duration,
      totalDays,
      reason,
      remarks,
      recordedBy,
    });

    const populatedLeave = await EmployeeLeave.findById(leave._id)
      .populate("employee", "employeeCode employeeName department designation");

    return res.status(201).json({
      success: true,
      message: "Employee leave recorded successfully.",
      data: populatedLeave,
    });
  } catch (error) {
    console.error("Create Employee Leave Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record employee leave.",
    });
  }
};

// GET ALL EMPLOYEE LEAVES
export const getAllEmployeeLeaves = async (
  req: Request,
  res: Response
) => {
  try {
    const leaves = await EmployeeLeave.find()
      .populate(
        "employee",
        "employeeCode employeeName department designation"
      )
      .sort({ fromDate: -1 });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (error) {
    console.error("Get Employee Leaves Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee leaves.",
    });
  }
};

// GET EMPLOYEE LEAVE BY ID
export const getEmployeeLeaveById = async (
  req: Request,
  res: Response
) => {
  try {
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave ID.",
      });
    }

    const leave = await EmployeeLeave.findById(id).populate(
      "employee",
      "employeeCode employeeName department designation"
    );

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: leave,
    });
  } catch (error) {
    console.error("Get Employee Leave Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch leave record.",
    });
  }
};

// GET LEAVE HISTORY FOR ONE EMPLOYEE
export const getEmployeeLeaveHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const employeeId = String(req.params.employeeId);

    const employeeExists = await validateEmployee(employeeId);

    if (!employeeExists) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const leaves = await EmployeeLeave.find({
      employee: employeeId,
    }).sort({ fromDate: -1 });

    const totalDays = leaves.reduce(
      (sum, leave) => sum + leave.totalDays,
      0
    );

    return res.status(200).json({
      success: true,
      employee: {
        _id: employeeExists._id,
        employeeCode: employeeExists.employeeCode,
        employeeName: employeeExists.employeeName,
      },
      totalRecords: leaves.length,
      totalLeaveDays: totalDays,
      data: leaves,
    });
  } catch (error) {
    console.error("Employee Leave History Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee leave history.",
    });
  }
};

// GET MONTHLY LEAVE REPORT
export const getMonthlyEmployeeLeaveReport = async (
  req: Request,
  res: Response
) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid month (1-12) and year.",
      });
    }

    const monthStart = new Date(
      Date.UTC(year, month - 1, 1)
    );

    const monthEnd = new Date(
      Date.UTC(year, month, 0)
    );

    // Include records that overlap any part of this month.
    const leaves = await EmployeeLeave.find({
      fromDate: { $lte: monthEnd },
      toDate: { $gte: monthStart },
    })
      .populate(
        "employee",
        "employeeCode employeeName department designation"
      )
      .sort({ fromDate: 1 });

    const summary = new Map<
      string,
      {
        employee: unknown;
        totalLeaveDays: number;
        leaveRecords: number;
      }
    >();

    const reportRecords = leaves.map((leave) => {
      const employee = leave.employee as any;

      const effectiveFrom =
        leave.fromDate > monthStart
          ? leave.fromDate
          : monthStart;

      const effectiveTo =
        leave.toDate < monthEnd
          ? leave.toDate
          : monthEnd;

      // Half-day records can only cover one date.
      // Full-day records are recalculated for the selected month.
      const daysInMonth = calculateWorkingDays(
        effectiveFrom,
        effectiveTo,
        leave.duration
      );

      const employeeId = employee?._id?.toString();

      if (employeeId) {
        const current = summary.get(employeeId) ?? {
          employee,
          totalLeaveDays: 0,
          leaveRecords: 0,
        };

        current.totalLeaveDays += daysInMonth;
        current.leaveRecords += 1;

        summary.set(employeeId, current);
      }

      return {
        ...leave.toObject(),
        daysInSelectedMonth: daysInMonth,
      };
    });

    return res.status(200).json({
      success: true,
      month,
      year,
      totalRecords: reportRecords.length,
      totalLeaveDays: reportRecords.reduce(
        (sum, record) => sum + record.daysInSelectedMonth,
        0
      ),
      employeeSummary: Array.from(summary.values()),
      data: reportRecords,
    });
  } catch (error) {
    console.error("Monthly Leave Report Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate monthly leave report.",
    });
  }
};

// UPDATE EMPLOYEE LEAVE
export const updateEmployeeLeave = async (
  req: Request,
  res: Response
) => {
  try {
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave ID.",
      });
    }

    const leave = await EmployeeLeave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record not found.",
      });
    }

    const {
      employee,
      leaveType,
      fromDate: fromDateInput,
      toDate: toDateInput,
      duration,
      reason,
      remarks,
      recordedBy,
    } = req.body;

    const nextEmployee = employee ?? leave.employee.toString();
    const nextLeaveType = leaveType ?? leave.leaveType;
    const nextFromDateInput =
      fromDateInput ??
      leave.fromDate.toISOString().slice(0, 10);
    const nextToDateInput =
      toDateInput ??
      leave.toDate.toISOString().slice(0, 10);
    const nextDuration = duration ?? leave.duration;

    if (
      !isValidDateString(nextFromDateInput) ||
      !isValidDateString(nextToDateInput)
    ) {
      return res.status(400).json({
        success: false,
        message: "Dates must use YYYY-MM-DD format.",
      });
    }

    if (
      !["Full Day", "Half Day"].includes(nextDuration)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave duration.",
      });
    }

    const validLeaveTypes = [
      "Casual Leave",
      "Sick Leave",
      "Earned Leave",
      "Unpaid Leave",
      "Other",
    ];

    if (!validLeaveTypes.includes(nextLeaveType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave type.",
      });
    }

    const nextFromDate = parseDate(nextFromDateInput);
    const nextToDate = parseDate(nextToDateInput);

    if (nextFromDate > nextToDate) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be after to date.",
      });
    }

    if (
      nextDuration === "Half Day" &&
      nextFromDateInput !== nextToDateInput
    ) {
      return res.status(400).json({
        success: false,
        message: "Half-day leave must be for a single date.",
      });
    }

    const employeeExists = await validateEmployee(nextEmployee);

    if (!employeeExists) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const totalDays = calculateWorkingDays(
      nextFromDate,
      nextToDate,
      nextDuration
    );

    if (totalDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Selected dates contain no working days.",
      });
    }

    const overlapping = await hasOverlappingLeave(
      nextEmployee,
      nextFromDate,
      nextToDate,
      id
    );

    if (overlapping) {
      return res.status(409).json({
        success: false,
        message:
          "This employee already has a leave record for an overlapping date.",
      });
    }

    leave.employee = new mongoose.Types.ObjectId(nextEmployee);
    leave.leaveType = nextLeaveType;
    leave.fromDate = nextFromDate;
    leave.toDate = nextToDate;
    leave.duration = nextDuration;
    leave.totalDays = totalDays;

    if (reason !== undefined) leave.reason = reason;
    if (remarks !== undefined) leave.remarks = remarks;
    if (recordedBy !== undefined) leave.recordedBy = recordedBy;

    await leave.save();

    const updatedLeave = await EmployeeLeave.findById(id).populate(
      "employee",
      "employeeCode employeeName department designation"
    );

    return res.status(200).json({
      success: true,
      message: "Employee leave updated successfully.",
      data: updatedLeave,
    });
  } catch (error) {
    console.error("Update Employee Leave Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update employee leave.",
    });
  }
};

// PERMANENTLY DELETE EMPLOYEE LEAVE
export const deleteEmployeeLeave = async (
  req: Request,
  res: Response
) => {
  try {
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave ID.",
      });
    }

    const leave = await EmployeeLeave.findByIdAndDelete(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee leave permanently deleted.",
    });
  } catch (error) {
    console.error("Delete Employee Leave Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete employee leave.",
    });
  }
};
