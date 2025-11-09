import { promises as fs } from "fs";

/**
 * 批量删除文件或文件夹（支持单个或多个）
 * @param filePaths 要删除的文件或文件夹的完整路径数组
 * @returns Promise<boolean> 全部删除成功返回 true，有任何失败返回 false
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
          await fs.rmdir(filePath, { recursive: true });
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
