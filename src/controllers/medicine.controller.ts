import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

import { sendSuccess, sendError } from "../utils/sendResponse.ts";
import { medicines } from "../db/schema.ts";
import { db } from "../db/db.ts";

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads");

const ensureUploadDir = async () => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// Configure multer for memory storage (we'll process before saving)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File received:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });

    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    const allowedExtensions = /\.(jpeg|jpg|png|gif|webp)$/i;
    
    const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.test(file.originalname);

    console.log('Validation result:', {
      hasValidMimeType,
      hasValidExtension,
      mimetype: file.mimetype
    });

    if (hasValidMimeType && hasValidExtension) {
      return cb(null, true);
    } else {
      const error = new Error(`Invalid file type. Received: ${file.mimetype}. Only image files are allowed (jpeg, jpg, png, gif, webp)`);
      console.error('File validation failed:', error.message);
      return cb(error);
    }
  },
});

// Middleware for single file upload
export const uploadMedicineImage = upload.single("medicineImage");

// Helper function to compress and save image
const processAndSaveImage = async (buffer: Buffer, originalName: string): Promise<string> => {
  await ensureUploadDir();
  
  const fileExtension = path.extname(originalName).toLowerCase();
  const filename = `${uuidv4()}${fileExtension}`;
  const filepath = path.join(uploadDir, filename);
  
  // Compress image using sharp
  let processedBuffer: Buffer;
  
  if (fileExtension === '.png') {
    // For PNG, maintain transparency but compress
    processedBuffer = await sharp(buffer)
      .resize(800, 800, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .png({ 
        quality: 80,
        compressionLevel: 8 
      })
      .toBuffer();
  } else {
    // For JPEG and other formats
    processedBuffer = await sharp(buffer)
      .resize(800, 800, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 80,
        progressive: true 
      })
      .toBuffer();
  }
  
  // Save compressed image
  await fs.writeFile(filepath, processedBuffer);
  
  return filename; // Return filename to store in database
};

// Helper function to delete old image
const deleteOldImage = async (filename: string | null) => {
  if (!filename) return;
  
  try {
    const filepath = path.join(uploadDir, filename);
    await fs.unlink(filepath);
  } catch (error) {
    console.log(`Could not delete old image: ${filename}`, error);
  }
};

//  GET /api/medicines
export const getMedicines = async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(medicines).orderBy(medicines.name);
    
    // Add full URL for images
    const medicinesWithImageUrls = data.map(medicine => ({
      ...medicine,
      medicineImageUrl: medicine.medicineImage ? 
        `${_req.protocol}://${_req.get('host')}/uploads/${medicine.medicineImage}` : 
        null
    }));
    
    return sendSuccess(res, "Medicines retrieved", { 
      results: medicinesWithImageUrls.length, 
      data: medicinesWithImageUrls 
    });
  } catch (error) {
    console.error("Error in getMedicines:", error);
    return sendError(res, "Failed to get medicines", 500);
  }
};

//  GET /api/medicines/:id
export const getMedicineById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const data = await db
      .select()
      .from(medicines)
      .where(eq(medicines.id, Number(id)));
      
    if (!data[0]) return sendError(res, "Medicine not found", 404);

    // Add full URL for image
    const medicineWithImageUrl = {
      ...data[0],
      medicineImageUrl: data[0].medicineImage ? 
        `${req.protocol}://${req.get('host')}/uploads/${data[0].medicineImage}` : 
        null
    };

    return sendSuccess(res, "Medicine retrieved", medicineWithImageUrl);
  } catch (error) {
    console.error("Error in getMedicineById:", error);
    return sendError(res, "Failed to get medicine", 500);
  }
};

//  POST /api/medicines
export const createMedicine = async (req: Request, res: Response) => {
  console.log('Create medicine request:', {
    body: req.body,
    file: req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file'
  });

  const { name, stock, description } = req.body;
  const imageFile = req.file;

  if (!name || stock === undefined) {
    return sendError(res, "Name and stock are required", 400);
  }

  try {
    let medicineImageFilename: string | null = null;
    
    // Process image if uploaded
    if (imageFile) {
      console.log('Processing image:', imageFile.originalname);
      medicineImageFilename = await processAndSaveImage(imageFile.buffer, imageFile.originalname);
      console.log('Image saved as:', medicineImageFilename);
    }

    const created = await db.insert(medicines).values({ 
      name, 
      stock: parseInt(stock),
      description: description || null,
      medicineImage: medicineImageFilename
    }).returning();

    // Add image URL to response
    const createdWithImageUrl = {
      ...created[0],
      medicineImageUrl: medicineImageFilename ? 
        `${req.protocol}://${req.get('host')}/uploads/${medicineImageFilename}` : 
        null
    };

    return sendSuccess(res, "Medicine created", createdWithImageUrl, 201);
  } catch (error) {
    console.error("Error in createMedicine:", error);
    return sendError(res, "Failed to create medicine", 500);
  }
};

//  PUT /api/medicines/:id
export const updateMedicine = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, stock } = req.body;
  const imageFile = req.file;

  try {
    // Get current medicine data
    const currentMedicine = await db
      .select()
      .from(medicines)
      .where(eq(medicines.id, Number(id)));

    if (!currentMedicine[0]) {
      return sendError(res, "Medicine not found", 404);
    }

    let medicineImageFilename = currentMedicine[0].medicineImage;

    // Process new image if uploaded
    if (imageFile) {
      console.log('Processing new image for update:', imageFile.originalname);
      
      // Delete old image if exists
      if (currentMedicine[0].medicineImage) {
        await deleteOldImage(currentMedicine[0].medicineImage);
      }
      
      // Save new compressed image
      medicineImageFilename = await processAndSaveImage(imageFile.buffer, imageFile.originalname);
      console.log('New image saved as:', medicineImageFilename);
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };
    
    if (name !== undefined) updateData.name = name;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (description !== undefined) updateData.description = description || null;
    if (imageFile) updateData.medicineImage = medicineImageFilename;

    const updated = await db
      .update(medicines)
      .set(updateData)
      .where(eq(medicines.id, Number(id)))
      .returning();

    // Add image URL to response
    const updatedWithImageUrl = {
      ...updated[0],
      medicineImageUrl: updated[0].medicineImage ? 
        `${req.protocol}://${req.get('host')}/uploads/${updated[0].medicineImage}` : 
        null
    };

    return sendSuccess(res, "Medicine updated successfully", updatedWithImageUrl);
  } catch (error) {
    console.error("Error in updateMedicine:", error);
    return sendError(res, "Failed to update medicine", 500);
  }
};

//  DELETE /api/medicines/:id
export const deleteMedicine = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Get medicine to delete associated image
    const medicineToDelete = await db
      .select()
      .from(medicines)
      .where(eq(medicines.id, Number(id)));

    if (!medicineToDelete[0]) {
      return sendError(res, "Medicine not found", 404);
    }

    // Delete associated image file
    if (medicineToDelete[0].medicineImage) {
      await deleteOldImage(medicineToDelete[0].medicineImage);
    }

    // Delete from database
    const deleted = await db
      .delete(medicines)
      .where(eq(medicines.id, Number(id)))
      .returning();

    return sendSuccess(res, "Medicine deleted", deleted[0]);
  } catch (error) {
    console.error("Error in deleteMedicine:", error);
    return sendError(res, "Failed to delete medicine", 500);
  }
};