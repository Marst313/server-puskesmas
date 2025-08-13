import { Response } from "express";

export const sendSuccess = (res: Response, message: string, data: any = {}, code = 200) => {
  return res.status(code).json({
    status: "success",
    message,
    data,
  });
};

export const sendError = (res: Response, error: any, code = 400) => {
  let message = "Terjadi kesalahan, silakan coba lagi.";

  // Duplicate key
  if (error?.cause?.code === "23505") {
    const DETAIL = error?.cause?.detail;
    message = DETAIL;
    code = 409;
  }

  // Not null violation
  if (error?.cause?.code === "23502") {
    const COLUMN = error?.cause?.column;
    message = `Field ${COLUMN} tidak boleh kosong`;
    code = 404;
  }

  if (typeof error === "string") {
    message = error;
  }

  return res.status(code).json({
    status: "error",
    message,
    timestamp: new Date(Date.now()),
  });
};
