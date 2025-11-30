import type { FileItem } from "@/types";
import { App, Checkbox, ColorPicker, Form, Input, InputNumber, Modal, Tag, type ModalProps } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import SelectDir from "../SelectDir";

export interface WatermarkModalProps extends ModalProps {
  open: boolean;
  onOk?: () => void;
  onCancel?: () => void;
  selectedFiles: FileItem[];
  currentDirectory: string;
}

export type FormType = {
  outputDir: string;
  watermarkText: string;
  isUseCurrentDir: boolean;
  fontSize?: number;
  color?: string;
  angle?: number;
  xRatio?: number;
  yRatio?: number;
};

const WatermarkModal: React.FC<WatermarkModalProps> = ({
  open,
  onOk,
  onCancel,
  selectedFiles,
  currentDirectory,
  ...rest
}) => {
  const [form] = Form.useForm<FormType>();
  const isUseCurrentDir = Form.useWatch("isUseCurrentDir", form);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { message } = App.useApp();
  const wmText = Form.useWatch("watermarkText", form);
  const wmColor = Form.useWatch("color", form);
  const wmSize = Form.useWatch("fontSize", form);
  const wmAngle = Form.useWatch("angle", form) ?? 0;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number; ox: number; oy: number; nw: number; nh: number; scale: number }>({ w: 0, h: 0, ox: 0, oy: 0, nw: 0, nh: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0.9, y: 0.9 });
  const previewSrc = useMemo(() => {
    const img = selectedFiles.find((f) => !!f.imageBase64)?.imageBase64;
    return img ?? selectedFiles[0]?.imageBase64;
  }, [selectedFiles]);

  const onFinish = async (values: FormType) => {
    if (!window.electronAPI) return;
    if (values.isUseCurrentDir) {
      values.outputDir = currentDirectory;
    }
    if (selectedFiles.length !== 1) {
      message.warning("请先选择文件");
      return;
    }
    setConfirmLoading(true);
    try {
      const res = await window.electronAPI.addWatermarks(
        [selectedFiles[0]],
        values.watermarkText,
        values.outputDir,
        {
          fontSize: values.fontSize,
          color: values.color,
          angle: values.angle,
          xRatio: dragPos.x,
          yRatio: dragPos.y,
        }
      );
      const ok = res.success;
      if (!ok) {
        const failed = res.results.filter((r) => !r.success).length;
        if (failed > 0) {
          message.error(`有 ${failed} 个文件加水印失败`);
        }
      }
    setConfirmLoading(false);
      if (res.success) {
        message.success("加水印成功");
        const outDir = values.isUseCurrentDir ? currentDirectory : values.outputDir;
        if (outDir) {
          window.dispatchEvent(new CustomEvent<string>("refresh-directory", { detail: outDir }));
        }
        onOk?.();
        onCancel?.();
      }
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
        watermarkText: "",
        color: "rgba(255,255,255,0.75)",
        angle: 0,
      });
      setDragPos({ x: 0.9, y: 0.9 });
    }
  }, [open, form, currentDirectory]);

  const handleImgLoad = () => {
    const cw = 320;
    const ch = 240;
    const img = imgRef.current;
    if (!img) return;
    const nw = img.naturalWidth || cw;
    const nh = img.naturalHeight || ch;
    const scale = Math.min(cw / nw, ch / nh);
    const w = Math.round(nw * scale);
    const h = Math.round(nh * scale);
    const ox = Math.round((cw - w) / 2);
    const oy = Math.round((ch - h) / 2);
    setDisplaySize({ w, h, ox, oy, nw, nh, scale });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = (containerRef.current as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left - displaySize.ox;
    const y = e.clientY - rect.top - displaySize.oy;
    const cx = Math.max(0, Math.min(displaySize.w, x));
    const cy = Math.max(0, Math.min(displaySize.h, y));
    const xr = displaySize.w ? cx / displaySize.w : 0;
    const yr = displaySize.h ? cy / displaySize.h : 0;
    setDragPos({ x: xr, y: yr });
  };

  const onMouseUp = () => setDragging(false);

  const previewFontPx = useMemo(() => {
    const s = displaySize.scale || 1;
    const naturalMin = Math.min(displaySize.nw || 0, displaySize.nh || 0);
    const defaultFont = Math.max(16, Math.round(naturalMin * 0.05));
    const base = wmSize && wmSize > 0 ? wmSize : defaultFont;
    return Math.round(base * s);
  }, [wmSize, displaySize]);

  return (
    <Modal
      {...rest}
      title="加水印"
      open={open}
      onOk={() => form.submit()}
      onCancel={() => onCancel?.()}
      maskClosable={false}
      keyboard={false}
      okButtonProps={{ disabled: selectedFiles.length !== 1 }}
      confirmLoading={confirmLoading}
    >
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Form.Item<FormType> label="已选文件">
          <div
            style={{
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {selectedFiles[0] && (
              <Tag bordered={false} color="processing" key={selectedFiles[0].path}>
                {selectedFiles[0].name}
              </Tag>
            )}
          </div>
        </Form.Item>
        <Form.Item<FormType>
          label="水印文案"
          name="watermarkText"
          rules={[{ required: true, message: "请输入水印文案" }]}
        >
          <Input maxLength={10} placeholder="最多10个字" />
        </Form.Item>
        
        <Form.Item<FormType> label="文字大小" name="fontSize">
          <InputNumber min={8} max={200} placeholder="自动" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item<FormType> label="颜色" name="color">
          <ColorPicker
            value={wmColor}
            onChangeComplete={(c: unknown) => {
              const s = (c as { toRgbString?: () => string }).toRgbString?.() ?? "rgba(255,255,255,0.75)";
              form.setFieldValue("color", s);
            }}
          />
        </Form.Item>
        <Form.Item<FormType> label="倾斜角度" name="angle">
          <InputNumber min={-180} max={180} placeholder="0" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item<FormType> label="预览">
          <div
            style={{
              position: "relative",
              border: "1px solid #eee",
              borderRadius: 8,
              width: 320,
              height: 240,
              overflow: "hidden",
              background: "#fafafa",
            }}
            ref={containerRef}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {previewSrc && (
              <img
                src={previewSrc}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                ref={imgRef}
                onLoad={handleImgLoad}
              />
            )}
            {wmText && (
              <div
                style={{
                  position: "absolute",
                  color: wmColor ?? "rgba(255,255,255,0.75)",
                  fontSize: `${previewFontPx}px`,
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  left: displaySize.ox + Math.round(displaySize.w * dragPos.x),
                  top: displaySize.oy + Math.round(displaySize.h * dragPos.y),
                  transformOrigin: "left top",
                  transform: `rotate(${wmAngle}deg) translate(-50%,-50%)`,
                  cursor: "grab",
                }}
                onMouseDown={() => setDragging(true)}
              >
                {wmText}
              </div>
            )}
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

export default WatermarkModal;
