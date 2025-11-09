import Directory from "@/components/Directory";
import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import "dayjs/locale/zh-cn";

const MyApp: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <App>
        <Directory></Directory>
      </App>
    </ConfigProvider>
  );
};

export default MyApp;
