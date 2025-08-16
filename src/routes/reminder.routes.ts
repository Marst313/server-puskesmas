import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createReminder, deleteReminder, getAllReminders, getRemindersByUser, updateReminderTimesTaken } from "../controllers/reminders.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", createReminder);
router.delete("/:id", deleteReminder);
router.post("/user", getRemindersByUser);
router.get("/users", getAllReminders);
router.patch("/:id/times-taken", updateReminderTimesTaken);


export default router;
