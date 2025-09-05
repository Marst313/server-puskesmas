import { Request, Response } from "express";
import { eq, sql } from "drizzle-orm";

import { db } from "../db/db.js";
import { medicines, reminders } from "../db/schema.js";
import { sendError, sendSuccess } from "../utils/sendResponse.js";

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
    console.log("Today:", today);

    for (let item of data) {
      if (item.lastTakenAt) {
        const lastTakenDate = new Date(item.lastTakenAt).toDateString();
        console.log(`Checking reminder ${item.id}: lastTaken=${lastTakenDate}, today=${today}`);
        
        if (lastTakenDate !== today) {
          console.log(`Resetting reminder ${item.id} in database`);
          
          await db
            .update(reminders)
            .set({ 
              timesTaken: 0,
              lastTakenAt: null
            })
            .where(eq(reminders.id, item.id));

          item.timesTaken = 0;
          item.lastTakenAt = null;
        }
      }
    }

    console.log("Final data after reset:", data.map(item => ({
      id: item.id,
      timesTaken: item.timesTaken,
      lastTakenAt: item.lastTakenAt
    })));

    return sendSuccess(res, "Reminders fetched", data);
  } catch (error) {
    console.log(error)
    return sendError(res, "Failed to fetch reminders");
  }
};

// POST /api/reminders/
export const createReminder = async (req: Request, res: Response) => {
  try {
    const { medId, time, beforeMeal, userId, quantity } = req.body;

    if (!medId || !time || !userId) {
      return sendError(res, "Missing fields", 400);
    }

    const medicine = await db.query.medicines.findFirst({
      where: eq(medicines.id, medId),
    });

    if (!medicine) {
      return sendError(res, "Medicine not found", 404);
    }

    if (medicine.stock < (quantity || 1)) {
      return sendError(res, "Stock not enough", 400);
    }

    const [newReminder] = await db
      .insert(reminders)
      .values({
        userId,
        medId,
        quantity: quantity || 1,
        time,
        beforeMeal: beforeMeal || false,
      })
      .returning();

    await db
      .update(medicines)
      .set({
        stock: medicine.stock - (quantity || 1),
      })
      .where(eq(medicines.id, medId));

    const reminderWithMedicine = await db
      .select({
        id: reminders.id,
        userId: reminders.userId,
        medId: reminders.medId,
        quantity: reminders.quantity,
        time: reminders.time,
        beforeMeal: reminders.beforeMeal,
        createdAt: reminders.createdAt,
        medicine: {
          id: medicines.id,
          name: medicines.name,
          stock: medicines.stock,
        },
      })
      .from(reminders)
      .leftJoin(medicines, eq(reminders.medId, medicines.id))
      .where(eq(reminders.id, newReminder.id))
      .limit(1);

    return sendSuccess(res, "Reminder created & stock updated", reminderWithMedicine[0]);
  } catch (error) {
    console.log(error);
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

    return sendSuccess(res, "Medicine history retrieved", data);
  } catch (error) {
    console.error(error);
    return sendError(res, "Failed to fetch medicine history");
  }
};

// PATCH /api/reminders/:id
export const updateReminder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, medId, timesTaken, quantity, beforeMeal } = req.body;

    const existing = await db.query.reminders.findFirst({
      where: eq(reminders.id, Number(id)),
    });

    if (!existing) {
      return sendError(res, "Reminder not found", 404);
    }

    const updated = await db
      .update(reminders)
      .set({
        userId: userId ?? existing.userId,
        medId: medId ?? existing.medId,
        timesTaken: timesTaken ?? existing.timesTaken,
        quantity: quantity ?? existing.quantity,
        beforeMeal: beforeMeal ?? existing.beforeMeal,
      })
      .where(eq(reminders.id, Number(id)))
      .returning();

    return sendSuccess(res, "Reminder updated", updated[0]);
  } catch (error) {
    console.error(error);
    return sendError(res, "Failed to update reminder", 500);
  }
};
