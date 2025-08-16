import express, { json } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";


// Security Middleware
import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";

// Routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import medicineRoutes from "./routes/medicine.routes.js";
import reminderRoutes from "./routes/reminder.routes.js";
import multer from "multer";

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet()); // Set security-related HTTP headers
app.use(hpp()); // Prevent HTTP parameter pollution

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // maksimal 100 request per IP per 15 menit
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

// JSON Body Parser
app.use(json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan("dev"));

// Routes
app.get("/", (_, res) => res.send("🚀 Medtrack API is running!"));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/reminders", reminderRoutes);

export default app;
