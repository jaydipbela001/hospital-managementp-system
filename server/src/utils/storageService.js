import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");

// shortcut: local filesystem storage; switch STORAGE_DRIVER to "cloudinary" or other free tier when ready
const DRIVER = process.env.STORAGE_DRIVER || "local";

export const uploadFile = async (file, folder = "general") => {
  if (!file) return null;

  if (DRIVER === "local") {
    const uploadDir = path.join(UPLOADS_ROOT, folder);
    await fs.mkdir(uploadDir, { recursive: true });

    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${Date.now()}-${safeName}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, file.buffer);
    return `/uploads/${folder}/${filename}`;
  }

  /*
  // Future Cloud provider integration (e.g. Cloudinary / Supabase):
  if (DRIVER === "cloudinary") {
    // const res = await cloudinary.uploader.upload_stream(...);
    // return res.secure_url;
  }
  */

  throw new Error(`Unsupported storage driver: ${DRIVER}`);
};

