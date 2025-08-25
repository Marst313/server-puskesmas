import { Router } from "express";
import { register, login, logout, getProfile, refreshSession, verifySession } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.post("/logout",authenticate, logout);
router.get("/profile",authenticate,  getProfile);
router.get("/verify-session",authenticate,  verifySession);
router.post("/refresh", authenticate, refreshSession);

export default router;
