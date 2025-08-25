// lib
import { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcrypt";

// db
import { sessions, users } from "../db/schema.js";
import { db } from "../db/db.js";

// utils
import { signJwt, verifyJwt } from "../utils/jwt.js";
import { sendSuccess, sendError } from "../utils/sendResponse.js";


// Session duration (24 hours)
const SESSION_DURATION_HOURS = 24;

// Helper function to calculate expiry time
const getExpiryTime = (): Date => {
  const now = new Date();
  now.setHours(now.getHours() + SESSION_DURATION_HOURS);
  return now;
};


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
    const expiresAt = getExpiryTime();

     await db
      .update(sessions)
      .set({ isActive: false, logoutAt: new Date() })
      .where(eq(sessions.userId, user[0].id));

// Cek apakah ada session sebelumnya
const existingSession = await db
  .select()
  .from(sessions)
  .where(eq(sessions.userId, user[0].id))
  .limit(1);

  await db.insert(sessions).values({
      token,
      userId: user[0].id,
      isActive: true,
      expiresAt,
      loginAt: new Date(),
    });

    return sendSuccess(res, "Login berhasil", {
      token,
      expiresAt: expiresAt.toISOString(),
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

// GET /api/auth/verify-session
export const verifySession = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return sendError(res, "Token tidak ditemukan.", 401);
    }

    const decoded:any = verifyJwt(token);
    if (!decoded) {
      return sendError(res, "Token tidak valid.", 401);
    }

    // Cek session di database
    const sessionData = await db
      .select({
        session: sessions,
        user: {
          id: users.id,
          name: users.name,
          rolesId: users.rolesId,
        },
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.token, token),
          eq(sessions.isActive, true),
          eq(sessions.userId, decoded.id)
        )
      )
      .limit(1);

    if (!sessionData[0]) {
      return sendError(res, "Session tidak ditemukan atau tidak aktif.", 401);
    }

    const { session, user } = sessionData[0];

    // Cek apakah session sudah expired
    if (session.expiresAt <= new Date()) {
      await db
        .update(sessions)
        .set({ isActive: false, logoutAt: new Date() })
        .where(eq(sessions.id, session.id));
      
      return sendError(res, "Session sudah kadaluarsa.", 401);
    }

    const timeUntilExpiry = session.expiresAt.getTime() - new Date().getTime();

    return sendSuccess(res, "Session valid", {
      user,
      expiresAt: session.expiresAt.toISOString(),
      timeUntilExpiry: Math.floor(timeUntilExpiry / 1000), // dalam detik
    });
  } catch (error) {
    console.error("Verify session error:", error);
    return sendError(res, "Gagal memverifikasi session.", 500);
  }
};


// POST /api/auth/refresh
export const refreshSession = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return sendError(res, "Token tidak ditemukan.", 401);
    }

    // Verify JWT token
    const decoded:any = verifyJwt(token);
    if (!decoded) {
      return sendError(res, "Token tidak valid.", 401);
    }

    // Cek session di database
    const existingSession = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.token, token),
          eq(sessions.userId, decoded.id),
          eq(sessions.isActive, true)
        )
      )
      .limit(1);

    if (!existingSession[0]) {
      return sendError(res, "Session tidak ditemukan atau sudah tidak aktif.", 401);
    }

    // Cek apakah session sudah expired
    const now = new Date();
    if (existingSession[0].expiresAt <= now) {
      // Set session sebagai tidak aktif
      await db
        .update(sessions)
        .set({ isActive: false, logoutAt: now })
        .where(eq(sessions.id, existingSession[0].id));
      
      return sendError(res, "Session sudah kadaluarsa.", 401);
    }

    // Generate new token dan extend expiry time
    const newToken = signJwt({ id: decoded.id, role: decoded.role });
    const newExpiresAt = getExpiryTime();

    // Update session dengan token baru dan waktu kadaluarsa baru
    await db
      .update(sessions)
      .set({
        token: newToken,
        expiresAt: newExpiresAt,
        lastRefreshAt: now,
      })
      .where(eq(sessions.id, existingSession[0].id));

    return sendSuccess(res, "Session berhasil diperpanjang", {
      token: newToken,
      expiresAt: newExpiresAt.toISOString(),
      user: {
        id: decoded.id,
        role: decoded.role,
      },
    });
  } catch (error) {
    console.error("Refresh session error:", error);
    return sendError(res, "Gagal memperpanjang session.", 500);
  }
};