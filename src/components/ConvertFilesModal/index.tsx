import type { FileItem } from "@/types";
import { App, Checkbox, Form, Modal, Radio, Tag, type ModalProps } from "antd";
import React, { useEffect, useState } from "react";
import SelectDir from "../SelectDir";

export interface ConvertFilesModalProps extends ModalProps {
  open: boolean;
  onOk?: () => void;
  onCancel?: () => void;
  selectedFiles: FileItem[];
  currentDirectory: string;
}

export type FormType = {
  outputDir: string;
  isUseCurrentDir: boolean;
};

const ConvertFilesModal: React.FC<ConvertFilesModalProps> = ({
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
  const [targets, setTargets] = useState<Record<string, "jpg" | "png" | "bmp">>({});
  const getExt = (name: string) => {
    const idx = name.lastIndexOf(".");
    const ext = idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
    return ext === "jpeg" ? "jpg" : ext;
  };
  const defaultTargetFor = (name: string): "jpg" | "png" | "bmp" => {
    const ext = getExt(name);
    if (ext === "jpg") return "png";
    if (ext === "png") return "jpg";
    if (ext === "bmp") return "jpg";
    return "jpg";
  };

  const onFinish = async (values: FormType) => {
    if (values.isUseCurrentDir) {
      values.outputDir = currentDirectory;
    }
    if (!window.electronAPI) return;
    setConfirmLoading(true);
    try {
      const tasks = selectedFiles.map((f) => ({
        file: f,
        targetFormat: targets[f.path] ?? defaultTargetFor(f.name),
      }));
      await window.electronAPI.convertFiles(tasks, values.outputDir);
      setConfirmLoading(false);
      onOk?.();
      onCancel?.();
      message.success("转换文件成功");
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
      });
      setTargets((prev) => {
        const next: Record<string, "jpg" | "png" | "bmp"> = { ...prev };
        for (const f of selectedFiles) {
          if (!next[f.path]) next[f.path] = defaultTargetFor(f.name);
        }
        return next;
      });
    }
  }, [open, form, currentDirectory]);

  return (
    <Modal
      {...rest}
      title="转换文件格式"
      open={open}
      onOk={() => form.submit()}
      onCancel={() => onCancel?.()}
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
        <Form.Item label="目标格式">
          <div
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {selectedFiles.map((f) => {
              const ext = getExt(f.name);
              const disableJpg = ext === "jpg";
              const disablePng = ext === "png";
              const disableBmp = ext === "bmp";
              const val = targets[f.path] ?? defaultTargetFor(f.name);
              return (
                <div key={f.path} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Tag bordered={false} color="processing" style={{ minWidth: 160 }}>{f.name}</Tag>
                  <Radio.Group
                    value={val}
                    onChange={(e) =>
                      setTargets((prev) => ({ ...prev, [f.path]: e.target.value }))
                    }
                  >
                    <Radio.Button value="jpg" disabled={disableJpg}>JPG</Radio.Button>
                    <Radio.Button value="png" disabled={disablePng}>PNG</Radio.Button>
                    <Radio.Button value="bmp" disabled={disableBmp}>BMP</Radio.Button>
                  </Radio.Group>
                </div>
              );
            })}
          </div>
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

export default ConvertFilesModal;