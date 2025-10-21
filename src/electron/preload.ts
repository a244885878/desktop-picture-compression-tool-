import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  sayHello: (name?: string) => {
    const message = name ? `Hello, ${name}!` : "Hello, Electron!";
    return message;
  },
});
