
import { Router } from "express";

import {
  createEmployeeLeave,
  getAllEmployeeLeaves,
  getEmployeeLeaveById,
  getEmployeeLeaveHistory,
  getMonthlyEmployeeLeaveReport,
  updateEmployeeLeave,
  deleteEmployeeLeave,
} from "../controllers/employeeLeave.controller";

const router = Router();

// Create leave record
router.post("/", createEmployeeLeave);

// Monthly report
router.get("/monthly", getMonthlyEmployeeLeaveReport);

// Employee leave history
router.get("/employee/:employeeId", getEmployeeLeaveHistory);

// Get all leave records
router.get("/", getAllEmployeeLeaves);

// Get leave by ID
router.get("/:id", getEmployeeLeaveById);

// Update leave
router.put("/:id", updateEmployeeLeave);

// Permanently delete leave
router.delete("/:id", deleteEmployeeLeave);

export default router;
