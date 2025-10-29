import { useEffect } from "react";
import styles from "./index.module.scss";
import { useImmer } from "use-immer";
import { FileItemTypeEnum, type FileItem, type BreadcrumbList } from "@/types";
import { Empty, Breadcrumb, Image, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { DropdownMenuEnum } from "@/types";

const Directory: React.FC = () => {
  const [list, setList] = useImmer<FileItem[]>([]);
  const [isEmpty, setIsEmpty] = useImmer(false);
  const [breadcrumb, setBreadcrumb] = useImmer<BreadcrumbList>([]);
  // 下拉菜单
  const dropdownMenu: MenuProps["items"] = [
    {
      key: DropdownMenuEnum.DELETE,
      label: <span>删除</span>,
    },
    {
      key: DropdownMenuEnum.RENAME,
      label: <span>重命名</span>,
    },
    {
      key: DropdownMenuEnum.COMPRESS,
      label: <span>压缩</span>,
    },
    {
      key: DropdownMenuEnum.DETAIL,
      label: <span>详情</span>,
    },
    {
      key: DropdownMenuEnum.FORMAT_CONVERT,
      label: <span>格式转换</span>,
    },
    {
      key: DropdownMenuEnum.CROP,
      label: <span>裁剪</span>,
    },
    {
      key: DropdownMenuEnum.WATERMARK,
      label: <span>加水印</span>,
    },
  ];

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
        <Dropdown
          menu={{ items: dropdownMenu }}
          trigger={["contextMenu"]}
          key={index}
        >
          <div className={styles.fileBox}>
            <Image src={item.imageBase64} className={styles.img} />
            <div className={styles.fileName}>{item.name}</div>
          </div>
        </Dropdown>
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
