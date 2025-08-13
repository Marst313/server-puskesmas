import { pgTable, serial, varchar, text, integer, date, boolean ,timestamp} from "drizzle-orm/pg-core";

// Roles
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
});

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  noHp: varchar("no_hp", { length: 15 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  rolesId: integer("roles_id")
    .notNull()
    .references(() => roles.id),
  createdAt: date("created_at").defaultNow(),
});

// Sessions
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: text("token"), 
  createdAt: date("created_at").defaultNow(),
  userId: integer("user_id")
  .notNull()
  .references(() => users.id),
  isActive: boolean("is_active").default(true),
  loginAt: timestamp("login_at").defaultNow(),
  logoutAt: timestamp("logout_at"),
});

// Medicines
export const medicines = pgTable("medicines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  stock: integer("stock").notNull(),
  description: text("description"),
  medicineImage: varchar("medicine_image", { length: 255 }),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// Reminders
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  medId: integer("med_id")
    .notNull()
    .references(() => medicines.id),
  quantity: integer("quantity"),
  timesTaken: integer("times_taken").default(0).notNull(),
  time: varchar("time", { length: 20 }).notNull(),
  beforeMeal: boolean("before_meal").notNull(),
  createdAt: date("created_at").defaultNow(),
  lastTakenAt: timestamp("last_taken_at"),
});


