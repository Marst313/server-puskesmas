import { Request, Response } from "express";
import { eq } from "drizzle-orm";

import { db } from "../db/db.js";
import { sessions, users } from "../db/schema.js";
import { sendError, sendSuccess } from "../utils/sendResponse.js";

// GET /api/users
export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const allUsers = await db.select({ id: users.id, name: users.name, noHp: users.noHp }).from(users).where(eq(users.rolesId, 2));
    return sendSuccess(res, "Users retrieved", { result: allUsers.length, data: allUsers });
  } catch (error) {
    return sendError(res, "Failed to fetch users");
  }
};

// GET /api/users/:id
export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        noHp: users.noHp,
      })
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (!user[0]) {
      return sendError(res, "Pasien tidak ditemukan.", 404);
    }

    console.log(user[0])

    return sendSuccess(res, "Data pasien ditemukan", user[0]);
  } catch (error) {
    console.error("Error getUserById:", error);
    return sendError(res, "Gagal mengambil data pasien", 500);
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (!existing[0]) {
      return sendError(res, "Pasien tidak ditemukan.", 404);
    }

    await db.delete(users).where(eq(users.id, parseInt(id)));

    return sendSuccess(res, "Pasien berhasil dihapus", "", 204);
  } catch (error) {
    console.error("Error deleteUser:", error);
    return sendError(res, "Gagal menghapus pasien", 500);
  }
};


// GET /api/users/active
export const getActiveUsers = async (_req: Request, res: Response) => {
  try {
    const data = await db
      .select({
        id: users.id,
        name: users.name,
        noHp: users.noHp,
        loginAt: sessions.loginAt,
        isActive: sessions.isActive,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.isActive, true));

    return sendSuccess(res, "User aktif berhasil diambil", { result: data.length, data });
  } catch (error) {
    console.error("Get active users error:", error);
    return sendError(res, "Gagal mengambil user aktif", 500);
  }
};
