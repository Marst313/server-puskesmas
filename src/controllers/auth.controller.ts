// lib
import { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcrypt";

// db
import { sessions, users } from "../db/schema.ts";
import { db } from "../db/db.ts";

// utils
import { signJwt } from "../utils/jwt.ts";
import { sendSuccess, sendError } from "../utils/sendResponse.ts";

// POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  const { name, password, noHp } = req.body;

  if (!name || !password || !noHp) {
    return sendError(res, "Semua field harus diisi.", 400);
  }

  try {
    const existing = await db.select().from(users).where(eq(users.name, name)).limit(1);

    if (existing.length > 0) {
      return sendError(res, "Nama pasien sudah terdaftar.", 409);
    }

    const hashed = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({
        noHp,
        name,
        password: hashed,
        rolesId: 2,
      })
      .returning();

    return sendSuccess(
      res,
      "Pasien berhasil dibuat.",
      {
        id: user.id,
        noHp: user.noHp,
        name: user.name,
      },
      201
    );
  } catch (error) {
    console.log(error);
    return sendError(res, error);
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return sendError(res, "Nama pasien dan kata sandi harus diisi.", 400);
  }

  try {
 const user = await db.select().from(users).where(eq(users.name, name)).limit(1);

    if (!user[0]) {
      return sendError(res, "Pasien tidak ditemukan, silakan mendaftar terlebih dahulu.", 404);
    }

    const isValid = await bcrypt.compare(password, user[0].password);
    if (!isValid) {
      return sendError(res, "Nama pasien atau kata sandi salah.", 401);
    }

    const token = signJwt({ id: user[0].id, role: user[0].rolesId });

// Cek apakah ada session sebelumnya
const existingSession = await db
  .select()
  .from(sessions)
  .where(eq(sessions.userId, user[0].id))
  .limit(1);

// Jika ada, update
if (existingSession.length > 0) {
  await db
    .update(sessions)
    .set({
      token,
      isActive: true,
      loginAt: new Date(),
      logoutAt: null,
    })
    .where(eq(sessions.userId, user[0].id));
} else {
  // Jika belum ada, insert baru
  await db.insert(sessions).values({
    token,
    userId: user[0].id,
    isActive: true,
    loginAt: new Date(),
  });
}


    return sendSuccess(res, "Login berhasil", {
      token,
      user: {
        id: user[0].id,
        name: user[0].name,
        role: user[0].rolesId,
      },
    });
  } catch (error) {
    return sendError(res, "Login gagal", 500);
  }
};

// POST /api/auth/logout
export const logout = async (req: Request, res: Response) => {
  try {
  const userId = req.user.id;
  const token = req.headers.authorization?.split(" ")[1];

  if (!userId || !token) {
    return sendError(res, "Tidak ada token atau userId.", 400);
  }

  await db
    .update(sessions)
    .set({ isActive: false, logoutAt: new Date() })
    .where(and(eq(sessions.token, token), eq(sessions.userId, userId)));

  return sendSuccess(res, "Logout berhasil.");
  } catch (error) {
    console.error("Gagal logout:", error);
    return sendError(res, "Gagal logout.", 500);
  }
  
};


// GET /api/auth/profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user?.id;

    if (!userId) {
      return sendError(res, "Tidak dapat mengakses profil.", 401);
    }

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user[0]) {
      return sendError(res, "Pengguna tidak ditemukan.", 404);
    }
    

    const { id, name, noHp, rolesId } = user[0];

    return sendSuccess(res, "Profil berhasil diambil", { id, name, noHp, rolesId });
  } catch (error) {
    console.error("Get profile error:", error);
    return sendError(res, "Gagal mengambil profil.", 500);
  }
};
