import Directory from "@/components/Directory";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import "dayjs/locale/zh-cn";

const App: React.FC = () => {
  return (
    <div>
      <ConfigProvider locale={zhCN}>
        <Directory></Directory>
      </ConfigProvider>
    </div>
  );
};

export default App;
