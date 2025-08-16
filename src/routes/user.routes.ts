import { Router } from "express";
import { authenticate, authorizeRole } from "../middlewares/auth.middleware.js";
import { deleteUser, getActiveUsers, getAllUsers, getUserById } from "../controllers/user.controller.js";

const router = Router();

// ADMIN ONLY AND NEED LOGIN
router.use(authenticate, authorizeRole([1]));

router.get("/", getAllUsers);

router.get("/active",getActiveUsers)

router
  .route("/:id") //
  .get(getUserById) //
  .delete(deleteUser);

export default router;
