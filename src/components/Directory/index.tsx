import { useEffect } from "react";
import styles from "./index.module.scss";
import { useState } from "react";
import { FileItemTypeEnum, type FileItem } from "@/types";

const Directory: React.FC = () => {
  const [list, setList] = useState<FileItem[]>([]);

  // 获取目录
  const getDirectory = (path?: string) => {
    if (window.electronAPI) {
      window.electronAPI.getDirectoryContents(path).then((res) => {
        setList(res);
      });
    }
  };

  useEffect(() => {
    getDirectory();
  }, []);

  // 动态显示文件类型
  const showFileType = (item: FileItem, index: number) => {
    // 文件夹
    if (item.type === FileItemTypeEnum.FOLDER) {
      return (
        <div
          className={styles.fileBox}
          key={index}
          onDoubleClick={() => getDirectory(item.path)}
        >
          <div className={styles.folderItem}></div>
          <div className={styles.fileName}>{item.name}</div>
        </div>
      );
    }
    // 图片
    if (item.type === FileItemTypeEnum.IMAGE) {
      return (
        <div className={styles.fileBox} key={index}>
          <img src={item.imageBase64} className={styles.img} />
          <div className={styles.fileName}>{item.name}</div>
        </div>
      );
    }
  };

  return (
    <div className={styles.directoryContainer}>
      <div className={styles.directoryItemList}>
        {list.map((item, index) => showFileType(item, index))}
      </div>
    </div>
  );
};

export default Directory;
