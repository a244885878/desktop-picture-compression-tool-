import { Button } from "antd";
import { useEffect } from "react";

const App: React.FC = () => {
  useEffect(() => {
    if (window.electronAPI) {
      console.log(window.electronAPI.sayHello());
    }
  }, []);

  return (
    <div>
      <Button type="primary">Primary Button</Button>
    </div>
  );
};

export default App;
