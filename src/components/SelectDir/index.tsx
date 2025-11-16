import React from "react";
import { TreeSelect } from "antd";
import type { FileItem } from "@/types";
import { FileItemTypeEnum } from "@/types";

type Node = {
  title: string;
  value: string;
  key: string;
  isLeaf?: boolean;
  children?: Node[];
};

export interface SelectDirProps {
  value?: string;
  onChange?: (value?: string) => void;
  currentDirectory?: string;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const SelectDir: React.FC<SelectDirProps> = ({
  value,
  onChange,
  currentDirectory,
  placeholder = "选择目录",
  allowClear = true,
  disabled,
  style,
  className,
}) => {
  const [treeData, setTreeData] = React.useState<Node[]>([]);

  const toNodes = React.useCallback((list: FileItem[]): Node[] => {
    const folders = list.filter((v) => v.type === FileItemTypeEnum.FOLDER);
    return folders.map((v) => ({
      title: v.name,
      value: v.path,
      key: v.path,
      isLeaf: false,
    }));
  }, []);

  const loadChildren = React.useCallback(
    async (dirPath: string): Promise<Node[]> => {
      const list =
        (await window.electronAPI?.getDirectoryContents?.(dirPath)) ?? [];
      return toNodes(list);
    },
    [toNodes]
  );

  const updateTreeData = React.useCallback(
    (list: Node[], key: string, children: Node[]): Node[] => {
      return list.map((node) => {
        if (node.key === key) {
          return { ...node, children };
        }
        if (node.children) {
          return {
            ...node,
            children: updateTreeData(node.children, key, children),
          };
        }
        return node;
      });
    },
    []
  );

  const onLoadData = React.useCallback(
    async (treeNode: unknown) => {
      const node = treeNode as {
        value?: string | number;
        key?: string;
        children?: Node[];
      };
      if (node.children && node.children.length) return;
      const val = node.value != null ? String(node.value) : "";
      if (!val) return;
      const children = await loadChildren(val);
      setTreeData((prev) =>
        updateTreeData(prev, String(node.key ?? node.value), children)
      );
    },
    [loadChildren, updateTreeData]
  );

  React.useEffect(() => {
    const run = async () => {
      if (currentDirectory) {
        const children = await loadChildren(currentDirectory);
        const title =
          currentDirectory.split(/[\\/]/).filter(Boolean).pop() ??
          currentDirectory;
        setTreeData([
          {
            title,
            value: currentDirectory,
            key: currentDirectory,
            isLeaf: false,
            children,
          },
        ]);
      } else {
        const list = (await window.electronAPI?.getDirectoryContents?.()) ?? [];
        setTreeData(toNodes(list));
      }
    };
    run().catch(() => {});
  }, [currentDirectory, loadChildren, toNodes]);

  return (
    <TreeSelect
      value={value}
      treeData={treeData}
      loadData={onLoadData}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled}
      style={style}
      className={className}
      onChange={(val) => onChange?.(val)}
      showSearch={false}
      treeDefaultExpandAll={false}
      labelInValue={false}
      treeNodeLabelProp="value"
    />
  );
};

export default SelectDir;
