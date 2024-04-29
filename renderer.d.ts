
export interface IIPC {
    send: (module: string, eventType: string, ...data: any) => void,

    on: (channel: string,
        func: (event: Electron.IpcRendererEvent, ...args: any[]) => void) =>
        Electron.IpcRenderer
}

export interface ICONSTANTS {
    MAIN: string,
}


declare global {
    interface Window {
        ipc: IIPC
        constants: ICONSTANTS
    }
}