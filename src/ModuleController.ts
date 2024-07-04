import { BrowserWindow } from "electron";
import * as path from "path";
import { SettingsProcess } from "./built_ins/settings_module/SettingsProcess";
import { HomeProcess } from "./built_ins/home_module/HomeProcess";
import { ModuleCompiler } from "./ModuleCompiler";
import { IPCSource, IPCCallback } from "./aarontburn.Volume_Controller/module_builder/IPCObjects";
import { ModuleSettings } from "./aarontburn.Volume_Controller/module_builder/ModuleSettings";
import { Process } from "./aarontburn.Volume_Controller/module_builder/Process";
import { Setting } from "./aarontburn.Volume_Controller/module_builder/Setting";
import { StorageHandler } from "./aarontburn.Volume_Controller/module_builder/StorageHandler";

const WINDOW_DIMENSION: { width: number, height: number } = { width: 1920, height: 1080 };


export class ModuleController implements IPCSource {

    private static isDev = false;

    private readonly ipc: Electron.IpcMain;
    private readonly modulesByIPCSource: Map<string, Process> = new Map();

    private settingsModule: SettingsProcess;
    private window: BrowserWindow;
    private currentDisplayedModule: Process;

    private initReady: boolean = false;
    private rendererReady: boolean = false;

    private ipcCallback: IPCCallback;


    public static isDevelopmentMode(): boolean {
        return this.isDev;
    }

    public constructor(ipcHandler: Electron.IpcMain, args: string[]) {
        if (args.includes("--dev")) {
            ModuleController.isDev = true;
        }

        this.ipc = ipcHandler;
    }

    public getIPCSource(): string {
        return "built_ins.Main";
    }

    public start(): void {
        this.createBrowserWindow();
        this.settingsModule = new SettingsProcess(this.ipcCallback, this.window);

        this.handleMainEvents();
        this.registerModules().then(() => {
            if (this.rendererReady) {
                this.init();
            } else {
                this.initReady = true;
            }

            this.checkSettings();

            const settings: ModuleSettings = this.settingsModule.getSettings();
            this.window.setBounds({
                x: Number(settings.getSetting('window_x').getValue()),
                y: Number(settings.getSetting('window_y').getValue()),
                height: Number(settings.getSetting('window_height').getValue()),
                width: Number(settings.getSetting('window_width').getValue()),
            });

            if ((settings.getSetting('window_maximized').getValue() as boolean) === true) {
                this.window.maximize();
            }

            this.window.show();
        });
    }

    private checkSettings(): void {
        this.modulesByIPCSource.forEach((module: Process, _) => {
            if (module === this.settingsModule) {
                return;
            }
            this.checkModuleSettings(module);
        });

    }

    private checkModuleSettings(module: Process) {
        const settingsMap: Map<string, any> = StorageHandler.readSettingsFromModuleStorage(module);

        const moduleSettings: ModuleSettings = module.getSettings();
        settingsMap.forEach((settingValue: any, settingName: string) => {
            const setting: Setting<unknown> = moduleSettings.getSetting(settingName);
            if (setting === undefined) {
                console.log("WARNING: Invalid setting name: '" + settingName + "' found.");
            } else {
                setting.setValue(settingValue);
            }
        });

        StorageHandler.writeModuleSettingsToStorage(module);
        this.settingsModule.addModuleSetting(module.getSettings());
    }

    private init(): void {
        const data: any[] = [];
        this.modulesByIPCSource.forEach((module: Process, _) => {
            data.push({
                moduleName: module.getName(),
                moduleID: module.getIPCSource(),
                htmlPath: module.getHTMLPath()
            });
        });
        this.ipcCallback.notifyRenderer(this, 'load-modules', data);
        this.swapVisibleModule(HomeProcess.MODULE_ID);
    }

    private handleMainEvents(): void | Promise<any> {
        this.ipc.handle(this.getIPCSource(), (_, eventType: string, data: any[]) => {
            switch (eventType) {
                case "renderer-init": {
                    if (this.initReady) {
                        this.init();
                    } else {
                        this.rendererReady = true;
                    }
                    break;
                }
                case "swap-modules": {
                    this.swapVisibleModule(data[0]);
                    break;
                }

            }
        });
    }

    private async handleExternal(source: IPCSource, eventType: string, ...data: any[]): Promise<any> {
        switch (eventType) {
            case "get-module-IDs": {
                return Array.from(this.modulesByIPCSource.keys());
            }

        }
    }

    public stop(): void {
        this.modulesByIPCSource.forEach((module: Process, _) => {
            module.onExit();
        });
    }

    private swapVisibleModule(moduleID: string): void {
        const module: Process = this.modulesByIPCSource.get(moduleID);
        if (module === this.currentDisplayedModule) {
            return; // If the module is the same, don't swap
        }

        this.currentDisplayedModule?.onGUIHidden();
        module.onGUIShown();
        this.currentDisplayedModule = module;
        this.ipcCallback.notifyRenderer(this, 'swap-modules', moduleID);
    }


    private createBrowserWindow(): void {
        this.window = new BrowserWindow({
            show: false,
            height: WINDOW_DIMENSION.height,
            width: WINDOW_DIMENSION.width,
            webPreferences: {
                devTools: ModuleController.isDevelopmentMode(),
                backgroundThrottling: false,
                preload: path.join(__dirname, "preload.js"),
            },
            autoHideMenuBar: true
        });

        this.window.on('close', () => {
            this.stop();
        })


        this.window.loadFile(path.join(__dirname, "./view/index.html"));

        this.ipcCallback = {
            notifyRenderer: (target: IPCSource, eventType: string, ...data: any[]) => {
                this.window.webContents.send(target.getIPCSource(), eventType, ...data);
            },
            requestExternalModule: this.handleInterModuleCommunication.bind(this) // Not sure if the binding is required
        }
    }

    private async handleInterModuleCommunication(source: IPCSource, targetModuleID: string, eventType: string, ...data: any[]) {
        if (targetModuleID === this.getIPCSource()) {
            return this.handleExternal(source, eventType, ...data);
        }


        const targetModule: Process = this.modulesByIPCSource.get(targetModuleID);
        if (targetModule === undefined) {
            console.error(`Module '${source.getIPCSource()}' attempted to access '${targetModuleID}', but no such module exists.`);
            return new Error(`No module with ID of ${source.getIPCSource()} found.`);
        }
        const response = await targetModule.handleExternal(source, eventType, ...data);
        return response;
    }

    private async registerModules(): Promise<void> {
        console.log("Registering modules...");

        this.addModule(new HomeProcess(this.ipcCallback));
        this.addModule(this.settingsModule);

        this.checkModuleSettings(this.settingsModule);

        const forceReload: boolean = this.settingsModule
            .getSettings()
            .getSetting("force_reload")
            .getValue() as boolean;


        console.log("Force Reload: " + forceReload);


        await ModuleCompiler
            .loadPluginsFromStorage(this.ipcCallback, forceReload)
            .then((modules: Process[]) => {
                modules.forEach(module => {
                    this.addModule(module);
                })
            });
    }


    private addModule(module: Process): void {
        const map: Map<string, Process> = new Map();
        const moduleID: string = module.getIPCSource();

        const existingIPCProcess: Process = map.get(moduleID);
        if (existingIPCProcess !== undefined) {
            console.error("WARNING: Modules with duplicate IDs have been found.");
            console.error(`ID: ${moduleID} | Registered Module: ${existingIPCProcess.getName()} | New Module: ${module.getName()}`);
            return;
        }

        console.log("\tRegistering " + moduleID);

        this.modulesByIPCSource.set(moduleID, module);

        this.ipc.handle(moduleID, (_, eventType: string, ...data: any[]) => {
            return module.handleEvent(eventType, ...data);
        });

    }

}