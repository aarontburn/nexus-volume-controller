// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.


const { ipcRenderer, contextBridge } = require('electron')


contextBridge.exposeInMainWorld('ipc', {
  // Channel: What module the source comes from
  // data[0]: Event Type
  // data[1:]: Data

  /**
   * The target should be in the form: "<target_name>-process".
   * e.x. to target the main process, it should be "main-process"
   */
  send: (target: string, eventType: string, ...data: any): void =>
    ipcRenderer.send(target, eventType, data),

  /**
   * Channel should be the in the form: "<channel_name>-renderer".
   * e.x. to listen to events from the home module, it should be "home-renderer"
   */
  on: (channel: string, func:(event: Electron.IpcRendererEvent, ...args: any[]) => void) =>
    ipcRenderer.on(channel, func)
});

contextBridge.exposeInMainWorld("constants", {
  MAIN: "main-process"
})