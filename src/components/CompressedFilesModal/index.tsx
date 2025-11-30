import type { FileItem } from "@/types";
import { App, Checkbox, Form, Modal, Slider, Tag, type ModalProps } from "antd";
import React, { useEffect, useState } from "react";
import SelectDir from "../SelectDir";

export interface CompressedFilesModalProps extends ModalProps {
  open: boolean;
  onOk?: () => void;
  onCancel?: () => void;
  selectedFiles: FileItem[];
  currentDirectory: string; // 当前目录
}

export type FormType = {
  outputDir: string; // 输出目录
  compressQuality: number; // 图片质量(越小压缩越狠)
  isUseCurrentDir: boolean; // 是否使用当前目录
};

const CompressedFilesModal: React.FC<CompressedFilesModalProps> = ({
  open,
  onOk,
  onCancel,
  selectedFiles,
  currentDirectory,
  ...rest
}) => {
  const [form] = Form.useForm();
  const isUseCurrentDir = Form.useWatch("isUseCurrentDir", form);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { message } = App.useApp();

  const onFinish = async (values: FormType) => {
    if (values.isUseCurrentDir) {
      values.outputDir = currentDirectory;
    }
    if (!window.electronAPI) return;
    setConfirmLoading(true);
    try {
      await window.electronAPI.compressFiles(
        selectedFiles.map((v) => v.path),
        values.outputDir,
        values.compressQuality
      );
      setConfirmLoading(false);
      const outDir = values.isUseCurrentDir ? currentDirectory : values.outputDir;
      if (outDir) {
        window.dispatchEvent(new CustomEvent<string>("refresh-directory", { detail: outDir }));
      }
      onOk?.();
      onCancel?.();
      message.success("压缩文件成功");
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setConfirmLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        isUseCurrentDir: true,
        outputDir: currentDirectory,
        compressQuality: 80,
      });
    }
  }, [open, form, currentDirectory]);

  return (
    <Modal
      {...rest}
      title="压缩文件"
      open={open}
      onOk={() => form.submit()}
      onCancel={() => onCancel?.()}
      maskClosable={false}
      keyboard={false}
      confirmLoading={confirmLoading}
    >
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Form.Item<FormType> label="已选文件">
          <div
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
            }}
          >
            {selectedFiles.map((v) => (
              <Tag bordered={false} color="processing" key={v.path}>
                {v.name}
              </Tag>
            ))}
          </div>
        </Form.Item>
        <Form.Item<FormType> label="图片质量" name="compressQuality">
          <Slider min={30} max={100} />
        </Form.Item>
        <Form.Item<FormType>
          label="输出目录"
          name="isUseCurrentDir"
          valuePropName="checked"
        >
          <Checkbox>当前目录</Checkbox>
        </Form.Item>
        {!isUseCurrentDir && (
          <Form.Item<FormType>
            label="选择目录"
            name="outputDir"
            rules={[{ required: true, message: "请选择输出目录" }]}
          >
            <SelectDir />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default CompressedFilesModal;
