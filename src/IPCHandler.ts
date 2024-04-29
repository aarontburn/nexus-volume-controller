import { BrowserWindow } from "electron";
import { IPCSource } from "./module_builder/IPCObjects";

// Note: This class should be used in the main process, not renderer process.
export class IPCHandler {

    private static ipc: Electron.IpcMain;
    private static window: BrowserWindow;

    constructor() {
        console.log("Constructor called")
    }

    public static construct(theWindow: BrowserWindow, theIpc: Electron.IpcMain) {
        this.ipc = theIpc;
        this.window = theWindow;
    }

    private static checkInit() {
        if (this.ipc == undefined || this.window == undefined) {
            throw new Error("IPC and/or BrowserWindow are not defined.")
        }
    }

    public static fireEventToRenderer(target: IPCSource, eventType: string, ...data: any[]): void {
        IPCHandler.checkInit()
        this.window.webContents.send(target.getIpcSource() + "-renderer", eventType, data);
    }

    public static fireEventToProcess(target: IPCSource, eventType: string, ...data: any[]): void {
        this.checkInit()
        this.window.webContents.send(target.getIpcSource() + "-process", eventType, data);
    }

    public static createHandler(
        source: IPCSource,
        func: (event: Electron.IpcMainEvent,
            eventType: string,
            data: object[]) => void): void {

        this.checkInit()
        this.ipc.on(source.getIpcSource() + "-process", func);
    }

    public static createHandlerFromString(
        source: string,
        func: (event: Electron.IpcMainEvent,
            eventType: string,
            data: object[]) => void): void {

        this.checkInit()
        this.ipc.on(source, func);
    }

}

