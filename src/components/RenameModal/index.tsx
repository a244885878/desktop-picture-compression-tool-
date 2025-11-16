import { FileItemTypeEnum, type FileItem } from "@/types";
import { Form, Input, Modal, App, type ModalProps } from "antd";
import React, { useEffect } from "react";

export interface RenameModalProps extends ModalProps {
  open: boolean;
  onOk?: () => void;
  onCancel?: () => void;
  file: FileItem;
}

export type FormType = {
  name: string;
};

const RenameModal: React.FC<RenameModalProps> = ({
  open,
  onCancel,
  file,
  onOk,
  ...rest
}) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const validateName = (_: unknown, value: string) => {
    void _;
    const name = (value ?? "").trim();
    if (name === "." || name === "..") return Promise.reject("文件名不合法");
    if (/[<>:"/\\|?*]/.test(name))
      return Promise.reject('文件名不能包含特殊字符: < > : " / \\ | ? *');
    if (/[\s.]$/.test(name)) return Promise.reject("文件名不能以空格或点结尾");
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name))
      return Promise.reject("文件名为系统保留名");
    if (file.type === FileItemTypeEnum.IMAGE && name.includes("."))
      return Promise.reject("图片文件名不能包含点号，后缀自动保留");
    return Promise.resolve();
  };

  const onFinish = async (values: FormType) => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.renameFile(file.path, values.name);
        message.success("重命名成功!");
        onCancel?.();
        onOk?.();
      } catch (error) {
        message.error(error instanceof Error ? error.message : String(error));
      }
    }
  };

  useEffect(() => {
    if (open) {
      const name =
        file.type === FileItemTypeEnum.IMAGE
          ? file.name.lastIndexOf(".") > 0
            ? file.name.slice(0, file.name.lastIndexOf("."))
            : file.name
          : file.name;
      form.setFieldsValue({ name });
    }
  }, [open, file, form]);

  return (
    <Modal
      {...rest}
      title="修改文件名"
      open={open}
      onOk={() => form.submit()}
      onCancel={() => onCancel?.()}
    >
      <Form form={form} onFinish={onFinish}>
        <Form.Item<FormType>
          label="文件名"
          name="name"
          rules={[
            { required: true, message: "请输入文件名!" },
            { validator: validateName },
          ]}
        >
          <Input maxLength={100} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RenameModal;
