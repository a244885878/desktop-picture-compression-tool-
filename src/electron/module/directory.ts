import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";
import { FileItemTypeEnum, type FileItem, type BreadcrumbList } from "@/types";
import sharp from "sharp";

/**
 * 获取目录内容（文件夹和图片文件）
 * @param dirPath 可选参数，指定要读取的路径。如果不传，则根据系统使用默认路径
 * @returns Promise<FileItem[]> 返回文件夹和图片文件列表
 */
export async function getDirectoryContents(
  dirPath?: string
): Promise<FileItem[]> {
  try {
    let targetPath = dirPath;

    // 如果没有传入路径，根据操作系统设置默认路径
    if (!targetPath) {
      const platform = os.platform();

      if (platform === "darwin") {
        // Mac系统：默认读取桌面目录
        targetPath = path.join(os.homedir(), "Desktop");
      } else if (platform === "win32") {
        // Windows系统：返回磁盘驱动器列表
        return await getWindowsDrives();
      } else {
        // 其他类Unix系统：使用主目录
        targetPath = os.homedir();
      }
    }

    // 读取目录内容
    const items = await fs.readdir(targetPath, { withFileTypes: true });
    const result: FileItem[] = [];

    for (const item of items) {
      const itemPath = path.join(targetPath, item.name);

      if (item.isDirectory()) {
        // 添加文件夹
        result.push({
          name: item.name,
          path: itemPath,
          type: FileItemTypeEnum.FOLDER,
        });
      } else if (item.isFile()) {
        // 检查是否为图片文件
        const ext = path.extname(item.name).toLowerCase();
        const imageExtensions = [
          ".jpg",
          ".jpeg",
          ".png",
          ".gif",
          ".bmp",
          ".webp",
          ".svg",
          ".ico",
          ".tiff",
          ".tif",
          ".raw",
          ".heic",
          ".heif",
        ];

        if (imageExtensions.includes(ext)) {
          // 读取图片文件并转换为Base64
          let imageBase64: string | undefined;
          try {
            const imageBuffer = await fs.readFile(itemPath);
            const mimeType = getMimeType(ext);
            imageBase64 = `data:${mimeType};base64,${imageBuffer.toString(
              "base64"
            )}`;
          } catch (error) {
            console.error(`读取图片文件失败: ${itemPath}`, error);
            // 如果读取失败，imageData保持undefined
          }

          result.push({
            name: item.name,
            path: itemPath,
            type: FileItemTypeEnum.IMAGE,
            imageBase64,
          });
        }
      }
    }

    // 按名称排序：文件夹在前，图片在后
    return result.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === "folder" ? -1 : 1;
    });
  } catch (error) {
    console.error("读取目录失败:", error);
    return [];
  }
}

/**
 * 获取Windows系统的磁盘驱动器列表
 * @returns Promise<FileItem[]> 返回可用的磁盘驱动器列表
 */
async function getWindowsDrives(): Promise<FileItem[]> {
  const drives: FileItem[] = [];

  // 检查从A:到Z:的所有可能磁盘驱动器
  for (let i = 65; i <= 90; i++) {
    const driveLetter = String.fromCharCode(i);
    const drivePath = `${driveLetter}:\\`;

    try {
      // 尝试访问磁盘来检查是否存在
      await fs.access(drivePath);

      // 尝试获取磁盘信息以确定磁盘类型
      let driveName = `${driveLetter}: 盘`;
      try {
        const stats = await fs.stat(drivePath);
        if (stats.isDirectory()) {
          // 可以进一步获取磁盘标签等信息
          driveName = `${driveLetter}: 盘`;
        }
      } catch {
        // 如果无法获取详细信息，使用默认名称
      }

      drives.push({
        name: driveName,
        path: drivePath,
        type: FileItemTypeEnum.FOLDER,
      });
    } catch {
      // 磁盘不存在或无法访问，跳过
      continue;
    }
  }

  return drives;
}

/**
 * 根据文件扩展名获取MIME类型
 * @param ext 文件扩展名（包含点号）
 * @returns 对应的MIME类型
 */
function getMimeType(ext: string): string {
  const mimeTypes: { [key: string]: string } = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
    ".raw": "image/x-raw",
    ".heic": "image/heic",
    ".heif": "image/heif",
  };

  return mimeTypes[ext.toLowerCase()] || "image/jpeg";
}

/**
 * 获取面包屑路径列表
 * @param dirPath 目录路径，如果不传则使用系统默认路径
 * @returns BreadcrumbList 面包屑路径数组，包含title和path，可直接用于getDirectoryContents方法
 */
export function getBreadcrumbList(dirPath?: string): BreadcrumbList {
  let targetPath = dirPath;

  // 如果没有传入路径，根据操作系统设置默认路径（与getDirectoryContents保持一致）
  if (!targetPath) {
    const platform = os.platform();

    if (platform === "darwin") {
      // Mac系统：默认读取桌面目录
      targetPath = path.join(os.homedir(), "Desktop");
    } else if (platform === "win32") {
      // Windows系统：返回空数组，因为显示的是驱动器列表
      return [];
    } else {
      // 其他类Unix系统：使用主目录
      targetPath = os.homedir();
    }
  }

  const breadcrumbList: BreadcrumbList = [];
  const platform = os.platform();

  if (platform === "win32") {
    // Windows 路径处理
    const normalized = path.resolve(targetPath);
    const parts = normalized.split(path.sep);

    // 第一个部分是驱动器（如 "C:"）
    let currentPath = parts[0] + path.sep; // "C:\"
    breadcrumbList.push({
      title: parts[0], // "C:"
      path: currentPath,
    });

    // 处理其余部分
    for (let i = 1; i < parts.length; i++) {
      if (parts[i]) {
        // 跳过空字符串
        currentPath = path.join(currentPath, parts[i]);
        breadcrumbList.push({
          title: parts[i], // 只显示当前目录名
          path: currentPath, // 完整路径
        });
      }
    }
  } else {
    // Unix-like 系统（Mac、Linux等）路径处理
    const normalized = path.resolve(targetPath);
    const parts = normalized.split(path.sep);

    // 第一个部分是根目录 "/"
    breadcrumbList.push({
      title: "/", // 根目录显示为 "/"
      path: "/",
    });

    // 处理其余部分
    let currentPath = "";
    for (let i = 1; i < parts.length; i++) {
      if (parts[i]) {
        // 跳过空字符串
        currentPath = path.join(currentPath, parts[i]);
        const fullPath = "/" + currentPath;
        breadcrumbList.push({
          title: parts[i], // 只显示当前目录名
          path: fullPath, // 完整路径
        });
      }
    }
  }

  return breadcrumbList;
}

/**
 * 获取文件或目录的详细信息
 * @param filePath 文件或目录的完整路径
 * @returns Promise<{
 *   name: string; // 文件名或目录名
 *   type: string; // 文件类型
 *   size: number; // 文件大小（字节），文件夹返回 0
 *   createdAt: number; // 创建时间（毫秒级时间戳）
 *   modifiedAt: number; // 最后修改时间（毫秒级时间戳）
 *   width?: number; // 图片宽度（像素），非图片文件返回 undefined
 *   height?: number; // 图片高度（像素），非图片文件返回 undefined
 * }> 文件或目录的详细信息
 */
export async function getFileInfo(filePath: string): Promise<{
  name: string;
  type: string;
  size: number;
  createdAt: number;
  modifiedAt: number;
  width?: number;
  height?: number;
}> {
  const stats = await fs.stat(filePath);
  const isDir = stats.isDirectory();
  const name = path.basename(filePath);
  const size = isDir ? 0 : stats.size;
  const createdAt = stats.birthtimeMs;
  const modifiedAt = stats.mtimeMs;
  if (isDir) {
    return {
      name,
      type: "folder",
      size,
      createdAt,
      modifiedAt,
    };
  }
  const ext = path.extname(filePath).toLowerCase();
  const extName = ext.startsWith(".") ? ext.slice(1) : ext;
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
    ".svg",
    ".ico",
    ".tiff",
    ".tif",
    ".raw",
    ".heic",
    ".heif",
    ".avif",
  ];
  if (imageExtensions.includes(ext)) {
    try {
      const meta = await sharp(filePath, { failOn: "none" }).metadata();
      return {
        name,
        type: extName,
        size,
        createdAt,
        modifiedAt,
        width: meta.width,
        height: meta.height,
      };
    } catch {
      return {
        name,
        type: extName,
        size,
        createdAt,
        modifiedAt,
      };
    }
  }
  return {
    name,
    type: extName,
    size,
    createdAt,
    modifiedAt,
  };
}
