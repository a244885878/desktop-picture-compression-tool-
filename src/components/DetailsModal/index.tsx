import type { FileInfo, FileItem } from "@/types";
import { Modal, type ModalProps } from "antd";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

export interface DetailsModalProps extends ModalProps {
  open: boolean;
  onOk: () => void;
  onCancel: () => void;
  file: FileItem;
}

const DetailsModal: React.FC<DetailsModalProps> = ({
  open,
  onOk,
  onCancel,
  file,
}) => {
  const [fileDetails, setFileDetails] = useState<FileInfo | undefined>(
    undefined
  ); // 文件详情
  const [loading, setLoading] = useState(false); // 加载状态

  // 获取文件详情
  const getFileDetails = async () => {
    if (window.electronAPI) {
      setLoading(true);
      try {
        const details = await window.electronAPI.getFileInfo(file.path);
        if (details) {
          setFileDetails(details);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (open) {
      getFileDetails();
    }
  }, [open]);

  return (
    <Modal
      title="文件详情"
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      maskClosable={false}
      keyboard={false}
      loading={loading}
    >
      {fileDetails && (
        <div>
          <p>文件路径：{file.path}</p>
          <p>文件大小：{(fileDetails.size / 1024 / 1024).toFixed(2)}MB</p>
          <p>
            文件创建时间：
            {dayjs(fileDetails.createdAt).format("YYYY-MM-DD HH:mm:ss")}
          </p>
          <p>
            文件修改时间：
            {dayjs(fileDetails.modifiedAt).format("YYYY-MM-DD HH:mm:ss")}
          </p>
          <p>
            文件尺寸：{fileDetails.width} x {fileDetails.height}
          </p>
        </div>
      )}
    </Modal>
  );
};

export default DetailsModal;
