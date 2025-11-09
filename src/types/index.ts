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

/**
 * 下拉菜单枚举
 */
export enum DropdownMenuEnum {
  /**
   * 删除
   */
  DELETE = "delete",
  /**
   * 重命名
   */
  RENAME = "rename",
  /**
   * 压缩
   */
  COMPRESS = "compress",
  /**
   * 详情
   */
  DETAIL = "detail",
  /**
   * 格式转换
   */
  FORMAT_CONVERT = "format_convert",
  /**
   * 裁剪
   */
  CROP = "crop",
  /**
   * 加水印
   */
  WATERMARK = "watermark",
}

declare global {
  interface Window {
    electronAPI?: {
      getDirectoryContents: (dirPath?: string) => Promise<FileItem[]>; // 获取目录内容
      getBreadcrumbList: (dirPath?: string) => BreadcrumbList; // 获取面包屑路径列表
      deleteFile: (filePaths: string[]) => Promise<boolean>; // 批量删除文件或文件夹
    };
  }
}
