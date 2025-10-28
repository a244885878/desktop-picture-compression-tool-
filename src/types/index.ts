export enum FileItemTypeEnum {
  /**
   * 文件夹
   */
  FOLDER = "folder",
  /**
   * 图片
   */
  IMAGE = "image",
}

export type FileItem = {
  /**
   * 文件/文件夹名称
   */
  name: string;
  /**
   * 完整路径
   */
  path: string;
  /**
   * 类型：文件夹、图片或磁盘
   */
  type: FileItemTypeEnum;
  /**
   * 图片的Base64数据（仅对图片类型有效）
   */
  imageBase64?: string;
};

/**
 * 面包屑列表
 */
export type BreadcrumbList = {
  title: string;
  path: string;
}[];

declare global {
  interface Window {
    electronAPI?: {
      getDirectoryContents: (dirPath?: string) => Promise<FileItem[]>; // 获取目录内容
      getBreadcrumbList: (dirPath?: string) => BreadcrumbList; // 获取面包屑路径列表
    };
  }
}
