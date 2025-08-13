import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt";
import { sendError } from "../utils/sendResponse";

export interface AuthRequest extends Request {
  user?: { id: number; role: number };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Tidak diperkenankan: Anda tidak diperkenankan melakukan tindakan ini.", 401);
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyJwt<{ id: number; role: number }>(token);

  if (!payload) {
    return sendError(res, "Tidak diperkenankan: Token sudah kadaluarsa.", 401);
  }

  req.user = payload;
  next();
}

export function authorizeRole(allowedRoles: number[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return sendError(res, "Dilarang: Anda dilarang melakukan ini.", 403);
    }

    next();
  };
}
