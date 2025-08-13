import { Router } from "express";
import { register, login, logout, getProfile } from "../controllers/auth.controller.ts";
import { authenticate } from "../middlewares/auth.middleware.ts";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.post("/logout",authenticate, logout);
router.get("/profile",authenticate,  getProfile);

export default router;
