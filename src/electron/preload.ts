import { contextBridge } from "electron";
import { getDirectoryContents, getBreadcrumbList } from "./module/directory";

contextBridge.exposeInMainWorld("electronAPI", {
  getDirectoryContents, // 获取目录内容
  getBreadcrumbList, // 获取面包屑列表
});
