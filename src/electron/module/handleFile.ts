import { promises as fs } from "fs";
import sharp from "sharp"; // 使用 sharp 进行跨格式图片压缩与编码
import bmp from "sharp-bmp";
import { FileItemTypeEnum, type FileItem } from "@/types";
import * as path from "path";

/**
 * 批量删除文件或文件夹（支持单个或多个）
 * @param filePaths 要删除的文件或文件夹的完整路径数组
 * @returns Promise<boolean> 全部删除成功返回 true，有任何失败返回 false
 *
 * 行为说明：
 * - 传入空数组时直接返回 true
 * - 文件夹采用递归删除
 * - 任意一个删除失败则最终返回 false
 */
export async function deleteFile(filePaths: string[]): Promise<boolean> {
  if (!filePaths || filePaths.length === 0) {
    return true;
  }

  const results = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          // 如果是文件夹，递归删除
          await fs.rm(filePath, { recursive: true, force: true });
        } else {
          // 如果是文件，直接删除
          await fs.unlink(filePath);
        }

        return true;
      } catch (error) {
        console.error(`删除文件失败: ${filePath}`, error);
        return false;
      }
    })
  );

  // 全部成功才返回 true
  return results.every((result) => result === true);
}

/**
 * 重命名文件或文件夹
 * @param filePath 原始完整路径
 * @param newName 新名称（仅名称，不含路径；文件可省略扩展名，将沿用原扩展名）
 * @returns Promise<boolean> 成功返回 true，失败返回 false（如目标同名已存在等）
 *
 * 规则说明：
 * - 仅修改同目录下的名称，不改变路径位置
 * - 对文件：若 newName 不含扩展名，将自动保留原扩展名
 * - 当目标路径与原路径一致时视为成功（无需实际修改）
 * - 若同目录下存在同名目标，返回 false
 */
export async function renameFile(
  filePath: string,
  newName: string
): Promise<boolean> {
  if (!filePath || !newName || !newName.trim()) {
    throw new Error("文件路径或新名称无效");
  }

  const sanitized = newName.trim();
  if (sanitized.includes("/") || sanitized.includes("\\")) {
    throw new Error("新名称不能包含路径分隔符");
  }

  let stats;
  try {
    stats = await fs.stat(filePath);
  } catch {
    throw new Error("源路径不存在或不可访问");
  }

  const dir = path.dirname(filePath);
  let base = sanitized;

  if (stats.isFile()) {
    const oldExt = path.extname(filePath);
    const newExt = path.extname(base);
    if (!newExt && oldExt) {
      base = `${base}${oldExt}`;
    }
  }

  const targetPath = path.join(dir, base);

  if (targetPath === filePath) {
    return true;
  }

  let exists = true;
  try {
    await fs.access(targetPath);
  } catch {
    exists = false;
  }
  if (exists) {
    throw new Error("同名文件或文件夹已存在");
  }

  try {
    await fs.rename(filePath, targetPath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`重命名失败: ${msg}`);
  }

  return true;
}

/**
 * 压缩结果类型
 * - inputPath：输入文件的绝对路径
 * - outputPath：输出文件的绝对路径（失败时为空字符串）
 * - success：是否压缩成功
 * - error：失败原因（仅在失败时存在）
 */
type CompressResult = { inputPath: string; outputPath: string; success: boolean; error?: string };

type ConvertResult = { inputPath: string; outputPath: string; success: boolean; error?: string };

/**
 * 判断是否为支持的图片格式
 * 支持：jpg/jpeg、png、webp、tif/tiff、avif
 */
function isSupportedFormat(ext: string) {
  const e = ext.toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif"].includes(e);
}

/**
 * 确保目录存在（不存在则递归创建）
 */
async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    return;
  }
}

/**
 * 根据命名规则生成输出文件路径并避免重名
 * 规则：
 * - 原文件名不包含“_压缩”：name.ext → name_压缩.ext
 * - 原文件名已包含“_压缩”：name_压缩.ext → name_压缩_1.ext；name_压缩_3.ext → name_压缩_4.ext
 * - 若目标已存在，则继续递增编号，直到找到可用文件名
 */
async function nextOutputPath(outputDir: string, inputPath: string) {
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const m = base.match(/^(.*)_压缩(?:_(\d+))?$/);
  const root = m ? m[1] : base;
  let n = m && m[2] ? parseInt(m[2], 10) + 1 : m ? 1 : 0;

  let candidateBase = n === 0 ? `${root}_压缩` : `${root}_压缩_${n}`;
  let candidate = path.join(outputDir, `${candidateBase}${ext}`);

  while (true) {
    try {
      await fs.access(candidate);
      n = n === 0 ? 1 : n + 1;
      candidateBase = `${root}_压缩_${n}`;
      candidate = path.join(outputDir, `${candidateBase}${ext}`);
    } catch {
      // 文件不存在，当前候选名可用
      return candidate;
    }
  }
}

/**
 * 根据命名规则生成“转换”后的输出文件路径并避免重名
 * 规则：
 * - 原文件名不包含“_转换”：name.ext → name_转换.<targetExt>
 * - 原文件名已包含“_转换”：name_转换.ext → name_转换_1.<targetExt>；name_转换_3.ext → name_转换_4.<targetExt>
 * - 若目标已存在，则继续递增编号，直到找到可用文件名
 */
async function nextConvertedOutputPath(outputDir: string, inputPath: string, targetExt: string) {
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const m = base.match(/^(.*)_转换(?:_(\d+))?$/);
  const root = m ? m[1] : base;
  let n = m && m[2] ? parseInt(m[2], 10) + 1 : m ? 1 : 0;

  let candidateBase = n === 0 ? `${root}_转换` : `${root}_转换_${n}`;
  let candidate = path.join(outputDir, `${candidateBase}${targetExt}`);

  while (true) {
    try {
      await fs.access(candidate);
      n = n === 0 ? 1 : n + 1;
      candidateBase = `${root}_转换_${n}`;
      candidate = path.join(outputDir, `${candidateBase}${targetExt}`);
    } catch {
      return candidate;
    }
  }
}

/**
 * 批量压缩图片文件
 * @param filePaths 需要压缩的图片绝对路径数组（仅文件）
 * @param outputDir 压缩后输出目录（不存在将自动创建）
 * @param quality 可选压缩质量（1-100，默认 80）
 * @returns { success, results }：总体成功标记与逐项结果
 *
 * 行为说明：
 * - 非文件或不支持的格式会返回失败项，但不影响其他文件的处理
 * - 输出文件扩展名保持与输入一致（不会跨格式转换）
 * - 命名规则遵循“原文件名_压缩”/“原文件名_压缩_序号”，避免重名
 */
export async function compressFiles(
  filePaths: string[],
  outputDir: string,
  quality?: number
): Promise<{ success: boolean; results: CompressResult[] }> {
  if (!filePaths || filePaths.length === 0) {
    return { success: true, results: [] };
  }

  // 质量校验与默认值处理
  const q = typeof quality === "number" && quality >= 1 && quality <= 100 ? quality : 80;
  await ensureDir(outputDir);

  const tasks = filePaths.map(async (inputPath): Promise<CompressResult> => {
    try {
      const stat = await fs.stat(inputPath);
      if (!stat.isFile()) {
        return { inputPath, outputPath: "", success: false, error: "not a file" };
      }

      const ext = path.extname(inputPath).toLowerCase();
      if (!isSupportedFormat(ext)) {
        return { inputPath, outputPath: "", success: false, error: "unsupported format" };
      }

      const outputPath = await nextOutputPath(outputDir, inputPath);
      // failOn: "none" 避免遇到损坏元数据时抛错
      const image = sharp(inputPath, { failOn: "none" });

      switch (ext) {
        case ".jpg":
        case ".jpeg":
          // 使用 mozjpeg 优化 JPEG 压缩
          await image.jpeg({ quality: q, mozjpeg: true }).toFile(outputPath);
          break;
        case ".png":
          // PNG：启用调色板并提高压缩等级，quality 表示输出质量倾向
          await image.png({ quality: q, compressionLevel: 9, palette: true }).toFile(outputPath);
          break;
        case ".webp":
          // WebP 有损压缩
          await image.webp({ quality: q }).toFile(outputPath);
          break;
        case ".tif":
        case ".tiff":
          // TIFF 有损压缩（若需无损可改用 compression/ predictor 配置）
          await image.tiff({ quality: q }).toFile(outputPath);
          break;
        case ".avif":
          // AVIF 有损压缩（可结合 chromaSubsampling 等参数进一步调优）
          await image.avif({ quality: q }).toFile(outputPath);
          break;
        default:
          return { inputPath, outputPath: "", success: false, error: "unsupported format" };
      }

      return { inputPath, outputPath, success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { inputPath, outputPath: "", success: false, error: msg };
    }
  });

  const results = await Promise.all(tasks);
  return { success: results.every((r) => r.success), results };
}

/**
 * 批量格式转换（不影响原文件）
 * @param files 文件对象数组（仅图片类型有效）
 * @param outputDir 输出目录（不存在将自动创建）
 * @param targetFormat 目标格式（支持 jpg、png、bmp）
 * @returns { success, results }：总体成功标记与逐项结果
 *
 * 行为说明：
 * - 非图片或非文件会返回失败项，但不影响其他文件处理
 * - 始终生成新文件，命名遵循“原文件名_转换”/“原文件名_转换_序号”，避免重名
 * - JPG 采用 mozjpeg 优化；PNG 使用默认编码；BMP 通过 sharp-bmp 输出
 */
export async function convertFiles(
  tasks: { file: FileItem; targetFormat: "jpg" | "png" | "bmp" }[],
  outputDir: string
): Promise<{ success: boolean; results: ConvertResult[] }> {
  if (!tasks || tasks.length === 0) {
    return { success: true, results: [] };
  }

  await ensureDir(outputDir);

  const jobs = tasks.map(async ({ file, targetFormat }): Promise<ConvertResult> => {
    const inputPath = file.path;
    try {
      if (file.type !== FileItemTypeEnum.IMAGE) {
        return { inputPath, outputPath: "", success: false, error: "not an image" };
      }

      const stat = await fs.stat(inputPath);
      if (!stat.isFile()) {
        return { inputPath, outputPath: "", success: false, error: "not a file" };
      }

      const fmt = String(targetFormat).toLowerCase();
      if (!["jpg", "png", "bmp"].includes(fmt)) {
        return { inputPath, outputPath: "", success: false, error: "unsupported target format" };
      }

      const targetExt = fmt === "jpg" ? ".jpg" : fmt === "png" ? ".png" : ".bmp";
      const outputPath = await nextConvertedOutputPath(outputDir, inputPath, targetExt);
      const image = sharp(inputPath, { failOn: "none" });

      if (fmt === "jpg") {
        await image.jpeg({ mozjpeg: true }).toFile(outputPath);
      } else if (fmt === "png") {
        await image.png().toFile(outputPath);
      } else {
        await bmp.sharpToBmp(image, outputPath);
      }

      return { inputPath, outputPath, success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { inputPath, outputPath: "", success: false, error: msg };
    }
  });

  const results = await Promise.all(jobs);
  return { success: results.every((r) => r.success), results };
}
