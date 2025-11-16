import { contextBridge } from "electron";
import { getDirectoryContents, getBreadcrumbList } from "./module/directory";
import { deleteFile, renameFile, compressFiles } from "./module/handleFile";

contextBridge.exposeInMainWorld("electronAPI", {
  getDirectoryContents, // 获取目录内容
  getBreadcrumbList, // 获取面包屑列表
  deleteFile, // 批量删除文件
  renameFile, // 重命名文件
  compressFiles, // 批量压缩图片
});
