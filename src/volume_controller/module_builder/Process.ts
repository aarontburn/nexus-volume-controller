import { IPCCallback, IPCSource } from "./IPCObjects";
import { ModuleSettings } from "./ModuleSettings";
import { Setting } from "./Setting";



export interface ModuleInfo {
    moduleName: string,
    author: string,
    version: string,
    description: string, 
    buildVersion: number,
    platforms: string[]
}


export abstract class Process implements IPCSource {

    public moduleInfo: ModuleInfo;

    public moduleSettings = new ModuleSettings(this);

    public ipcCallback: IPCCallback;
    public moduleName: string;
    public hasBeenInit: boolean = false;

    public htmlPath: string;

    public constructor(theModuleName: string, theHtmlPath: string, ipcCallback: IPCCallback) {
        this.moduleName = theModuleName;
        this.htmlPath = theHtmlPath;
        this.ipcCallback = ipcCallback;

        this.moduleSettings.addAllSettings(this.registerSettings());
    }

    public getIPCSource(): string {
        return this.moduleName.toLowerCase();
    }

    public getModuleName(): string {
        return this.moduleName;
    }

    public getSettings(): ModuleSettings {
        return this.moduleSettings;
    }


    public getSettingsFileName(): string {
        return this.moduleName.toLowerCase() + "_settings.json";
    }

    public isInitialized(): boolean {
        return this.hasBeenInit;
    }

    public initialize(): void {
        this.hasBeenInit = true;
        // Override this, and do a super.initialize() after initializing model.
    }

    public getModuleInfo(): ModuleInfo {
        return this.moduleInfo;
    }

    public setModuleInfo(moduleInfo: ModuleInfo) {
        if (this.moduleInfo !== undefined) {
            throw new Error("Attempted to reassign module info for " + this.moduleName);
        }
        this.moduleInfo = moduleInfo;
    }


    public abstract registerSettings(): Setting<unknown>[];

    public abstract refreshSettings(): void;

    public onGuiShown() {
        // Do nothing by default
    }

    public stop(): void {
        // moduleGUI.stop();
    }

    public getHtmlPath(): string {
        return this.htmlPath;
    }


    public toString(): string {
        return this.moduleName;
    }

    public abstract receiveIPCEvent(eventType: string, data: any[]): void

    public notifyObservers(eventType: string, ...data: any): void {
        this.ipcCallback.notifyRenderer(this, eventType, ...data);
        // IPCHandler.fireEventToRenderer(this, eventType, data);
    }



}