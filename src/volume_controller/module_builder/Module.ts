import { IPCCallback, IPCSource } from "./IPCObjects";
import { ModuleSettings } from "./ModuleSettings";
import { Setting } from "./Setting";




export abstract class Module implements IPCSource {

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

    getIpcSource(): string {
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
        // moduleGUI.initialize()

        this.hasBeenInit = true;
        // Override this, and do a super.initialize() after initializing model.
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

    public abstract recieveIpcEvent(eventType: string, data: any[]): void

    public notifyObservers(eventType: string, ...data: any): void {
        this.ipcCallback.notifyRenderer(this, eventType, data);
        // IPCHandler.fireEventToRenderer(this, eventType, data);
    }



}