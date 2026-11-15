
import { Router } from "express";

import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
} from "../controllers/project.controller";

const router = Router();

// Create project
router.post("/", createProject);

// Get all projects
router.get("/", getProjects);

// Get project by ID
router.get("/:id", getProjectById);

// Update project
router.put("/:id", updateProject);

// Permanently delete project
router.delete("/:id", deleteProject);

export default router;
