const { ipcRenderer, contextBridge, } = require('electron')

contextBridge.exposeInMainWorld('ipc', {
	send: (target: string, eventType: string, ...data: any): void =>
		ipcRenderer.send(target, eventType, data),

	on: (channel: string, func: (event: Electron.IpcRendererEvent, ...args: any[]) => void) =>
		ipcRenderer.on(channel, func)
});

