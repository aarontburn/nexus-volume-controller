import { BrowserWindow } from "electron";
import * as path from "path";
import { IPCHandler } from "./IPCHandler";
import { StorageHandler } from "./volume_controller/module_builder/StorageHandler";
import { VolumeControllerProcess } from "./volume_controller/VolumeControllerProcess";
import { Process } from "./volume_controller/module_builder/Process";
import { IPCCallback, IPCSource } from "./volume_controller/module_builder/IPCObjects";
import { ModuleSettings } from "./volume_controller/module_builder/ModuleSettings";
import { Setting } from "./volume_controller/module_builder/Setting";
import { SettingsProcess } from "./built_ins/settings_module/SettingsProcess";
import { HomeProcess } from "./built_ins/home_module/HomeProcess";



const WINDOW_DIMENSION: { width: number, height: number } = { width: 1920, height: 1080 };

const ipcCallback: IPCCallback = {
    notifyRenderer: IPCHandler.fireEventToRenderer.bind(IPCHandler)
}


export class ModuleController implements IPCSource {

    private window: BrowserWindow;
    
    private readonly ipc: Electron.IpcMain;
    private readonly modulesByName = new Map();
    private readonly activeModules: Process[] = [];

    private settingsModule: SettingsProcess;
    private currentDisplayedModule: Process;


    public constructor(ipcHandler: Electron.IpcMain) {
        this.ipc = ipcHandler;
    }

    public getIPCSource(): string {
        return "main";
    }

    public start(): void {
        this.createAndShow();
        this.settingsModule = new SettingsProcess(ipcCallback, this.window);

        this.registerModules();
        this.checkSettings();
        this.attachIpcHandler();
        this.window.show();
    }

    private checkSettings(): void {
        for (const module of this.activeModules) {
            if (module === this.settingsModule) {
                continue;
            }
            this.checkModuleSettings(module);
        }
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
        const map: Map<string, string> = new Map<string, string>();
        this.activeModules.forEach((module: Process) => {
            map.set(module.getName(), module.getHTMLPath());
        });
        ipcCallback.notifyRenderer(this, 'load-modules', map);
        this.swapVisibleModule(HomeProcess.MODULE_NAME);
    }

    private attachIpcHandler(): void {
        IPCHandler.createHandler(this, (_, eventType: string, data: any[]) => {
            switch (eventType) {
                case "renderer-init": {
                    this.init();
                    break;
                }
                case "swap-modules": {
                    this.swapVisibleModule(data[0]);
                    break;
                }
            }
        });

        this.activeModules.forEach((module: Process) => {
            console.log("Registering " + module.getIPCSource() + "-process");
            this.ipc.on(module.getIPCSource() + "-process", (_, eventType: string, data: any[]) => {
                this.modulesByName.get(module.getName()).handleEvent(eventType, data);
            })
        });
    }

    public stop(): void {
        this.activeModules.forEach((module: Process) => {
            module.stop();
        });
    }

    private swapVisibleModule(moduleName: string): void {
        const module: Process = this.modulesByName.get(moduleName);
        if (module === this.currentDisplayedModule) {
            return; // If the module is the same, don't swap
        }

        this.currentDisplayedModule?.onGUIHidden()
        module.onGUIShown();
        this.currentDisplayedModule = module;
        ipcCallback.notifyRenderer(this, 'swap-modules', moduleName);
    }


    private createAndShow(): void {
        this.window = new BrowserWindow({
            show: false,
            height: WINDOW_DIMENSION.height,
            width: WINDOW_DIMENSION.width,
            webPreferences: {
                backgroundThrottling: false,
                preload: path.join(__dirname, "preload.js"),
            },
            autoHideMenuBar: true
        });
        this.window.loadFile(path.join(__dirname, "../index.html"));
        IPCHandler.construct(this.window, this.ipc);

    }

    private registerModules(): void {
        console.log("Registering modules...");

        this.addModule(new HomeProcess(ipcCallback));
        this.addModule(this.settingsModule);

        this.checkModuleSettings(this.settingsModule);

        this.addModule(new VolumeControllerProcess(ipcCallback));

    }





    private addModule(module: Process): void {
        const map: Map<string, Process> = new Map();
        for (const process of Array.from(this.modulesByName.values())) {
            if (map.has(process.getIPCSource())) {
                throw new Error("FATAL: Modules with duplicate IPC source names have been found. Source: " + process.getIPCSource());
            }
            map.set(process.getIPCSource(), process);
        }

        if (this.modulesByName.has(module.getName())) {
            console.error("WARNING: Duplicate modules have been found with the name: " + module.getName());
            console.error('Skipping the duplicate.');
            return;
        }

        const existingIPCProcess: Process = map.get(module.getIPCSource());
        if (existingIPCProcess !== undefined) {
            console.error("WARNING: Modules with duplicate IPCSource names have been found.");
            console.error(`IPC Source: ${module.getIPCSource()} | Registered Module: ${existingIPCProcess.getName()} | New Module: ${module.getName()}`);
            return;
        }

        this.modulesByName.set(module.getName(), module);
        this.activeModules.push(module);
    }



}