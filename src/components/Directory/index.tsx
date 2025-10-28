import { useEffect } from "react";
import styles from "./index.module.scss";
import { useImmer } from "use-immer";
import { FileItemTypeEnum, type FileItem, type BreadcrumbList } from "@/types";
import { Empty, Breadcrumb, Image } from "antd";

const Directory: React.FC = () => {
  const [list, setList] = useImmer<FileItem[]>([]);
  const [isEmpty, setIsEmpty] = useImmer(false);
  const [breadcrumb, setBreadcrumb] = useImmer<BreadcrumbList>([]);

  // 获取目录
  const getDirectory = (path?: string) => {
    if (window.electronAPI) {
      window.electronAPI.getDirectoryContents(path).then((res) => {
        setList(res);
        // 目录是否为空
        if (!res.length) setIsEmpty(true);
        else setIsEmpty(false);
      });
      // 获取面包屑
      const breadcrumbList = window.electronAPI.getBreadcrumbList(path);
      setBreadcrumb(breadcrumbList);
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
          <Image src={item.imageBase64} className={styles.img} />
          <div className={styles.fileName}>{item.name}</div>
        </div>
      );
    }
  };

  return (
    <div className={styles.directoryContainer}>
      <Breadcrumb
        separator=">"
        items={breadcrumb.map((item) => ({
          title: item.title,
          path: item.path,
          onClick: () => {
            getDirectory(item.path);
          },
        }))}
      />
      <div className={styles.directoryItemList}>
        {isEmpty ? (
          <div className={styles.emptyContainer}>
            <Empty />
          </div>
        ) : (
          list.map((item, index) => showFileType(item, index))
        )}
      </div>
    </div>
  );
};

export default Directory;
