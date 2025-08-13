import { Request, Response } from "express";
import { eq, sql } from "drizzle-orm";

import { db } from "../db/db";
import { medicines, reminders } from "../db/schema";
import { sendError, sendSuccess } from "../utils/sendResponse";

// GET /api/reminders
export const getAllReminders = async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(reminders);
    return sendSuccess(res, "Reminders retrieved", data);
  } catch (error) {
    console.log(error);
    return sendError(res, "Failed to fetch reminders");
  }
};

// POST /api/reminders/user
export const getRemindersByUser = async (req: Request, res: Response) => {
  try {
    const userId = req.body.id;

    if (!userId) return sendError(res, "Unauthorized", 401);

    const data = await db
      .select({
        id: reminders.id,
        userId: reminders.userId,
        medId: reminders.medId,
        quantity: reminders.quantity,
        timesTaken: reminders.timesTaken,
        lastTakenAt: reminders.lastTakenAt,
        time: reminders.time,
        beforeMeal: reminders.beforeMeal,
        createdAt: reminders.createdAt,
        medicineName: sql`COALESCE(${medicines.name}, '')`.as("medicine_name"),
        medicineImage: sql`COALESCE(${medicines.medicineImage}, '')`.as("medicine_image")
      })
      .from(reminders)
      .leftJoin(medicines, eq(reminders.medId, medicines.id))
      .where(eq(reminders.userId, userId));
      
      const today = new Date().toDateString();

      for (let item of data) {
      if (!item.lastTakenAt) continue;

      const lastTakenDate = new Date(item.lastTakenAt).toDateString();
      if (lastTakenDate !== today && item.timesTaken > 0) {
        await db
          .update(reminders)
          .set({ timesTaken: 0 })
          .where(eq(reminders.id, item.id));

        item.timesTaken = 0;
      }
    }

    return sendSuccess(res, "Reminders fetched", data);
  } catch (error) {
    console.log(error)
    return sendError(res, "Failed to fetch reminders");
  }
};

// POST /api/reminders/
export const createReminder = async (req: Request, res: Response) => {
  try {
    const { medId, time,  beforeMeal, userId,quantity } = req.body;

    if (!medId || !time || !userId) {
      return sendError(res, "Missing fields", 400);
    }

    const data = await db.insert(reminders).values({
      userId,
      medId,
      quantity: quantity || 1,
      time,
      beforeMeal:beforeMeal || false,
    });

    return sendSuccess(res, "Reminder created", data);
  } catch (error) {

    console.log(error)
    return sendError(res, "Failed to create reminder");
  }
};

// DELETE /api/reminders/:id
export const deleteReminder = async (req: Request, res: Response) => {
  try {
    const reminderId = parseInt(req.params.id);

    const reminder = await db.query.reminders.findFirst({
      where: eq(reminders.id, reminderId),
    });

    if (!reminder) {
      return sendError(res, "Reminder not found", 404);
    }

    await db.delete(reminders).where(eq(reminders.id, reminderId));

    return sendSuccess(res, "Reminder deleted");
  } catch (error) {
    return sendError(res, "Failed to delete reminder");
  }
};

// PATCH /api/reminders/:id/reset
export const resetReminderTimesTaken = async (req: Request, res: Response) => {
  try {
    const reminderId = parseInt(req.params.id);

    if (isNaN(reminderId)) {
      return sendError(res, "Invalid reminder ID", 400);
    }

    const reminder = await db.query.reminders.findFirst({
      where: eq(reminders.id, reminderId),
    });

    if (!reminder) {
      return sendError(res, "Reminder not found", 404);
    }

    await db
      .update(reminders)
      .set({
        timesTaken: 0,
        lastTakenAt: null,
      })
      .where(eq(reminders.id, reminderId));

    return sendSuccess(res, "Reminder reset successfully", {
      id: reminderId,
      timesTaken: 0,
      lastTakenAt: null,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, "Failed to reset reminder");
  }
};

// PATCH /api/reminders/:id/times-taken
export const updateReminderTimesTaken = async (req: Request, res: Response) => {
  try {
    const reminderId = parseInt(req.params.id);
    const { timesTaken, lastTakenAt } = req.body;

    if (isNaN(reminderId) || timesTaken === undefined) {
      return sendError(res, "Invalid request data", 400);
    }

    const reminder = await db.query.reminders.findFirst({
      where: eq(reminders.id, reminderId),
    });

    if (!reminder) {
      return sendError(res, "Reminder not found", 404);
    }

    await db
      .update(reminders)
      .set({
        timesTaken,
        lastTakenAt: lastTakenAt ? new Date(lastTakenAt) : new Date(),
      })
      .where(eq(reminders.id, reminderId));

    return sendSuccess(res, "Reminder updated", {
      id: reminderId,
      timesTaken,
      lastTakenAt: lastTakenAt || new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return sendError(res, "Failed to update reminder");
  }
};

// GET /api/reminders/history/:userId
export const getMedicineHistory = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    if (isNaN(userId)) {
      return sendError(res, "Invalid user ID", 400);
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await db
      .select({
        id: reminders.id,
        medicineName: medicines.name,
        medicineImage: medicines.medicineImage,
        quantity: reminders.quantity,
        timesTaken: reminders.timesTaken,
        time: reminders.time,
        beforeMeal: reminders.beforeMeal,
        lastTakenAt: reminders.lastTakenAt,
        createdAt: reminders.createdAt
      })
      .from(reminders)
      .leftJoin(medicines, eq(reminders.medId, medicines.id))
      .where(eq(reminders.userId, userId));
      // Note: You might want to add date filtering here based on lastTakenAt or createdAt

    return sendSuccess(res, "Medicine history retrieved", data);
  } catch (error) {
    console.error(error);
    return sendError(res, "Failed to fetch medicine history");
  }
};