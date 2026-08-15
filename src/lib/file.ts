"server-only"
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { fileTypeFromBuffer } from "file-type";

const MAX_SIZE_PER_TYPE: Record<string, number> = {
  // images
  "image/jpeg": 5 * 1024 * 1024,
  "image/png": 5 * 1024 * 1024,
  "image/webp": 5 * 1024 * 1024,

  // documents
  "application/pdf": 2 * 1024 * 1024,

  // videos
  "video/mp4": 100 * 1024 * 1024,
  "video/quicktime": 100 * 1024 * 1024,
  "video/webm": 80 * 1024 * 1024,
  "video/x-matroska": 150 * 1024 * 1024,
  "video/x-msvideo": 50 * 1024 * 1024,
  "video/mpeg": 80 * 1024 * 1024,
  "video/3gpp": 30 * 1024 * 1024,
};

const DANGEROUS_EXTENSIONS = [
  "php",
  "phtml",
  "php3",
  "php4",
  "pl",
  "py",
  "sh",
  "exe",
  "bat",
  "cmd",
  "scr",
  "msi",
  "jar",
];

const DEFAULT_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "storage",
  "media"
);

const getStorageRoot = () => {
  return process.env.STORAGE_PATH ?? DEFAULT_UPLOAD_DIR;
};

const sanitizeFilename = (filename?: string): string => {
  if (!filename) return ""
  return filename
    .replace(/[/\\]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
};

const sanitizeDirectory = (directory: string): string => {
  return directory
    .split("/")
    .filter(Boolean)
    .filter((part) => part !== "." && part !== "..")
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, "_"))
    .join("/");
};

const getUploadDirectory = (directory: string): string => {
  const baseDir = getStorageRoot();
  const safeDirectory = sanitizeDirectory(directory);

  return safeDirectory
    ? path.join(baseDir, safeDirectory)
    : baseDir;
};

const getRelativeFilePath = (
  directory: string,
  filename: string
): string => {
  const safeDirectory = sanitizeDirectory(directory);
  const safeFilename = sanitizeFilename(filename);

  return safeDirectory
    ? `${safeDirectory}/${safeFilename}`
    : safeFilename;
};

/**
 * Validate file buffer against allowed MIME types.
 *
 * file.type comes from the client and should NOT be trusted.
 * file-type inspects the actual file signature.
 */
const validateFileBuffer = async (
  buffer: Buffer,
  declaredMime: string,
  allowedMimes?: string[]
): Promise<string> => {
  const detected = await fileTypeFromBuffer(buffer).catch(() => null);

  const detectedMime = detected?.mime ?? declaredMime;

  if (allowedMimes?.length && !allowedMimes.includes(detectedMime)) {
    throw new Error(
      `Tipe file ${detectedMime} tidak diperbolehkan.`
    );
  }

  if (!MAX_SIZE_PER_TYPE[detectedMime]) {
    throw new Error(
      `Tipe file ${detectedMime} tidak diperbolehkan.`
    );
  }

  return detectedMime;
};

/**
 * Save a native Web File from Next.js.
 */
const saveFile = async (
  file: File,
  directory: string,
  filename?: string
): Promise<string> => {
  try {
    if (!(file instanceof File)) {
      throw new Error("Invalid file.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!buffer.length) {
      throw new Error("File kosong.");
    }

    const declaredMime = file.type || "application/octet-stream";

    const detectedMime = await validateFileBuffer(
      buffer,
      declaredMime
    );

    const maxSize = MAX_SIZE_PER_TYPE[detectedMime];

    if (buffer.length > maxSize) {
      throw new Error(
        `Ukuran file ${file.name} (${(
          buffer.length /
          (1024 * 1024)
        ).toFixed(2)}MB) melewati batas maksimal ${(
          maxSize /
          (1024 * 1024)
        ).toFixed(2)}MB.`
      );
    }

    const uploadDir = getUploadDirectory(directory);

    await fs.mkdir(uploadDir, {
      recursive: true,
    });

    const now = new Date();

    const datetimeStr =
      `${now.getFullYear()}` +
      `${String(now.getMonth() + 1).padStart(2, "0")}` +
      `${String(now.getDate()).padStart(2, "0")}_` +
      `${String(now.getHours()).padStart(2, "0")}` +
      `${String(now.getMinutes()).padStart(2, "0")}` +
      `${String(now.getSeconds()).padStart(2, "0")}`;

    const sanitizedFilename = sanitizeFilename(file.name);

    const actualFilename =
      sanitizeFilename(filename) ||
      `${datetimeStr}_${sanitizedFilename}`;

    const uploadPath = path.join(
      uploadDir,
      actualFilename
    );

    await fs.writeFile(uploadPath, buffer);

    return getRelativeFilePath(
      directory,
      actualFilename
    );
  } catch (error) {
    console.error("File upload failed:", error);

    throw new Error(
      error instanceof Error
        ? error.message
        : "Gagal menyimpan file."
    );
  }
};

/**
 * Delete a file using its relative storage path.
 *
 * Example:
 * deleteFile("payment/20260815_invoice.pdf")
 */
const deleteFile = async (
  filePath: string
): Promise<boolean> => {
  try {
    const baseDir = path.resolve(getStorageRoot());

    const absolutePath = path.resolve(
      baseDir,
      filePath
    );

    // Prevent ../../ path traversal
    if (
      absolutePath !== baseDir &&
      !absolutePath.startsWith(`${baseDir}${path.sep}`)
    ) {
      throw new Error("Invalid file path.");
    }

    await fs.unlink(absolutePath);

    return true;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return false;
    }

    throw error;
  }
};

/**
 * Get absolute filesystem path.
 */
const getRelativePath = (
  filePath: string
): string => {
  const baseDir = path.resolve(getStorageRoot());

  const absolutePath = path.resolve(
    baseDir,
    filePath
  );

  if (
    absolutePath !== baseDir &&
    !absolutePath.startsWith(`${baseDir}${path.sep}`)
  ) {
    throw new Error("Invalid file path.");
  }

  return absolutePath;
};

/**
 * Download a remote file and save it.
 */
const downloadFile = async (
  url: string,
  directory: string,
  filename?: string,
  maxFileSize: number = 5 * 1024 * 1024
): Promise<string | null> => {
  try {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      maxContentLength: maxFileSize,
      maxBodyLength: maxFileSize,
      timeout: 30_000,
    });

    const buffer = Buffer.from(response.data);

    if (buffer.length > maxFileSize) {
      throw new Error("File terlalu besar.");
    }

    const contentType =
      String(response.headers["content-type"])
        ?.split(";")[0]
        ?.trim() || "application/octet-stream";

    const detected = await fileTypeFromBuffer(buffer).catch(
      () => null
    );

    const detectedMime =
      detected?.mime ?? contentType;

    const maxSize =
      MAX_SIZE_PER_TYPE[detectedMime];

    if (!maxSize) {
      throw new Error(
        `Tipe file ${detectedMime} tidak diperbolehkan.`
      );
    }

    if (buffer.length > maxSize) {
      throw new Error(
        `Ukuran file melewati batas maksimal.`
      );
    }

    const uploadDir =
      getUploadDirectory(directory);

    await fs.mkdir(uploadDir, {
      recursive: true,
    });

    let actualFilename = filename;

    if (!actualFilename) {
      const extension =
        detected?.ext ||
        getExtensionFromMime(detectedMime);

      actualFilename =
        `${Date.now()}${extension ? `.${extension}` : ""}`;
    }

    actualFilename =
      sanitizeFilename(actualFilename);

    const uploadPath = path.join(
      uploadDir,
      actualFilename
    );

    await fs.writeFile(uploadPath, buffer);

    return getRelativeFilePath(
      directory,
      actualFilename
    );
  } catch (error) {
    console.error(
      "File download failed:",
      error
    );

    return null;
  }
};

const getFileBuffer = async (
  filePath: string
) => {
  const response = await axios.get<ArrayBuffer>(
    filePath,
    {
      responseType: "arraybuffer",
    }
  );

  return {
    buffer: Buffer.from(response.data),
    contentType:
      response.headers["content-type"] ||
      "application/octet-stream",
  };
};

const getFullFileUrl = (
  filePath: string
): string => {
  const appUrl =
    process.env.APP_URL ||
    "http://localhost";

  const appPort =
    process.env.APP_PORT || "3000";

  const env =
    process.env.NODE_ENV || "development";

  const baseUrl =
    env === "development"
      ? `${appUrl}:${appPort}`
      : appUrl;

  return `${baseUrl}/storage/${filePath}`;
};

const validateAndCleanFile = async (
  filePath: string,
  allowedMimes?: string[]
): Promise<boolean> => {
  try {
    const absolutePath =
      getRelativePath(filePath);

    const buffer =
      await fs.readFile(absolutePath);

    const ext = path
      .extname(absolutePath)
      .toLowerCase()
      .replace(".", "");

    if (
      ext &&
      DANGEROUS_EXTENSIONS.includes(ext)
    ) {
      await fs.unlink(absolutePath);
      return false;
    }

    const detected =
      await fileTypeFromBuffer(buffer).catch(
        () => null
      );

    const detectedMime =
      detected?.mime || null;

    if (
      detectedMime &&
      allowedMimes?.length &&
      !allowedMimes.includes(detectedMime)
    ) {
      await fs.unlink(absolutePath);
      return false;
    }

    if (
      !detectedMime &&
      allowedMimes?.length
    ) {
      await fs.unlink(absolutePath);
      return false;
    }

    return true;
  } catch {
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore
    }

    return false;
  }
};

export const scanAndCleanDirectory = async (
  directory: string,
  allowedMimes?: string[],
  recursive = true
): Promise<{
  cleaned: string[];
  errors: string[];
}> => {
  const cleaned: string[] = [];
  const errors: string[] = [];

  const baseDir =
    getUploadDirectory(directory);

  const scanDir = async (
    dirPath: string
  ): Promise<void> => {
    try {
      const entries =
        await fs.readdir(dirPath, {
          withFileTypes: true,
        });

      for (const entry of entries) {
        const fullPath = path.join(
          dirPath,
          entry.name
        );

        if (entry.isDirectory()) {
          if (recursive) {
            await scanDir(fullPath);
          }

          continue;
        }

        const isSafe =
          await validateAndCleanFile(
            fullPath,
            allowedMimes
          );

        if (!isSafe) {
          cleaned.push(fullPath);
        }
      }
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  };

  await scanDir(baseDir);

  return {
    cleaned,
    errors,
  };
};

const getExtensionFromMime = (
  mime: string
): string | null => {
  const mapping: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "video/x-matroska": "mkv",
    "video/x-msvideo": "avi",
    "video/mpeg": "mpeg",
    "video/3gpp": "3gp",
  };

  return mapping[mime] ?? null;
};

export {
  saveFile,
  deleteFile,
  getRelativePath,
  downloadFile,
  getFileBuffer,
  getFullFileUrl,
  sanitizeFilename,
};