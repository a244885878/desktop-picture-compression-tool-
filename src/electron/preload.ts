import { contextBridge } from "electron";
import { getDirectoryContents } from "./module/directory";

contextBridge.exposeInMainWorld("electronAPI", {
  getDirectoryContents, // 获取目录内容
});
