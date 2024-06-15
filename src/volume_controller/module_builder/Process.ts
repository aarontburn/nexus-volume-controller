import { IPCCallback, IPCSource } from "./IPCObjects";
import { ModuleSettings } from "./ModuleSettings";
import { Setting } from "./Setting";



export interface ModuleInfo {
    moduleName: string,
    author: string,
    version: string,
    description: string,
    buildVersion: number,
    platforms: string[],
    link?: string
}

/**
 *  Class to encapsulate module behavior.
 * 
 *  Many fields/methods are not intended to be public. However, the process
 *      of loading external modules forces everything to be public, for some reason.
 *      Fields/methods that have the @private annotations should be treated as if they were
 *      private and should NOT be accessed directly.
 * 
 *  @interface
 *  @author aarontburn
 */
export abstract class Process implements IPCSource {

    /**
     *  @private 
     *  @see getSetting
     * 
     *  Object to store this module's settings.
     *  This should not be directly accessed.
     */
    public readonly moduleSettings = new ModuleSettings(this);

    /**
     *  @private 
     * 
     *  IPC callback function.
     */
    public readonly ipcCallback: IPCCallback;

    /**
     *  @private 
     *  @see getName
     * 
     *  Ths name of this module.
     */
    public readonly moduleName: string;

    /**
     *  @private
     *  @see ModuleInfo
     *  @see getModuleInfo
     * 
     *  The information about this module.
     *
     */
    public moduleInfo: ModuleInfo;

    /**
     *  @private
     *  @see isInitialized
     * 
     *  Boolean indicating if this module has been initialized.
     */
    public hasBeenInit: boolean = false;

    /**
     *  @private
     *  @see getHTMLPath
     * 
     *  The path to the HTML.
     */
    public htmlPath: string;

    /**
     *  Entry point.
     * 
     *  @param moduleName   The name of the module,
     *  @param htmlPath     The path to the HTML frontend.
     *  @param ipcCallback  The IPC callback function.
     */
    public constructor(moduleName: string, htmlPath: string, ipcCallback: IPCCallback) {
        this.moduleName = moduleName;
        this.htmlPath = htmlPath;
        this.ipcCallback = ipcCallback;

        this.moduleSettings.addSettings(this.registerSettings());
    }

    /**
     *  @returns the name of the IPC source. By default,
     *      returns the name of the module, in lowercase. 
     */
    public getIPCSource(): string {
        return this.moduleName.toLowerCase();
    }


    /**
     *  @returns the name of the module.
     */
    public getName(): string {
        return this.moduleName;
    }

    /**
     *  @returns the settings associated with this module. 
     */
    public getSettings(): ModuleSettings {
        return this.moduleSettings;
    }

    /**
     *  @returns the name of the settings file associated with this module.
     */
    public getSettingsFileName(): string {
        return this.moduleName.toLowerCase() + "_settings.json";
    }

    /**
     *  @returns true if @see initialize() has been called, false otherwise.
     */
    public isInitialized(): boolean {
        return this.hasBeenInit;
    }

    /**
     *  Lifecycle function that is (usually) called when the renderer is ready.
     *  Should be overridden and treated as the entry point to the module.
     * 
     *  Child classes MUST do super.initialize() to properly
     *      set @see hasBeenInit, if the module depends on it.
     */
    public initialize(): void {
        this.hasBeenInit = true;
        // Override this, and do a super.initialize() after initializing model.
    }

    /**
     *  @returns the info for this module.
     *  @see ModuleInfo
     */
    public getModuleInfo(): ModuleInfo {
        return this.moduleInfo;
    }

    /**
     *  Sets the info for this module.
     *  For external modules, this information is stored within 'moduleinfo.json',
     *      and will automatically be set here.
     * 
     *  @param moduleInfo The module info.
     */
    public setModuleInfo(moduleInfo: ModuleInfo) {
        if (this.moduleInfo !== undefined) {
            throw new Error("Attempted to reassign module info for " + this.moduleName);
        }
        this.moduleInfo = moduleInfo;
    }

    /**
     *  Abstract function to register settings for this module.
     */
    public abstract registerSettings(): Setting<unknown>[];


    /**
     *  Function that is called whenever a setting that belongs to this
     *      module is modified.
     * 
     *  For an example on how to use this, see {@link HomeProcess}
     */
    public abstract refreshSettings(): void;

    /**
     *  @private
     * 
     *  Lifecycle function that is called whenever the module is shown.
     */
    public onGUIShown() {
        // Do nothing by default.
    }

    /**
     *  @private 
     * 
     *  Lifecycle function that is called whenever the module is hidden.
     */
    public onGUIHidden() {
        // Do nothing by default. 
    }

    /**
     *  @private
     * 
     *  Lifecycle function that is called before the application exits.
     */
    public stop(): void {
        // Do nothing by default
    }

    /**
     *  @returns the path to the HTML file associated with this module. 
     */
    public getHTMLPath(): string {
        return this.htmlPath;
    }


    /**
     *  @returns a string representation of this module. Currently, just returns the name.
     */
    public toString(): string {
        return this.moduleName;
    }

    /**
     *  Entry point to receive events from the renderer. 
     * 
     *  @param eventType The name of the event
     *  @param data The data sent from the renderer.
     */
    public abstract handleEvent(eventType: string, data: any[]): void


    /**
     *  Send an event to the renderer.
     * 
     *  @param eventType The name of the event.
     *  @param data The data to send.
     *  @see https://www.electronjs.org/docs/latest/tutorial/ipc#object-serialization
     */
    public sendToRenderer(eventType: string, ...data: any): void {
        this.ipcCallback.notifyRenderer(this, eventType, ...data);
    }



}