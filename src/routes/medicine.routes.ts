import { Router } from "express";
import { getMedicines, getMedicineById, createMedicine, updateMedicine, deleteMedicine, uploadMedicineImage } from "../controllers/medicine.controller";
import { authenticate, authorizeRole } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);
router.get("/", getMedicines);
router.get("/:id", getMedicineById);

// ADMIN ONLY
router.use(authorizeRole([1]));

router.post("/", uploadMedicineImage, createMedicine);

router.put("/:id", uploadMedicineImage, updateMedicine);
router.delete("/:id", deleteMedicine);

export default router;
