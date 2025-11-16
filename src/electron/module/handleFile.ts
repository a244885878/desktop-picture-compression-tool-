import { promises as fs } from "fs";
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
