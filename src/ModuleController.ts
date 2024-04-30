import { BrowserWindow } from "electron";
import * as path from "path";
import { IPCHandler } from "./IPCHandler";
import { StorageHandler } from "./StorageHandler";
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
    private ipc: Electron.IpcMain;

    private modulesByName = new Map<string, Process>();
    private activeModules: Process[] = [];
    private settingsModule: SettingsProcess = new SettingsProcess(ipcCallback);

    public constructor(ipcHandler: Electron.IpcMain) {
        this.ipc = ipcHandler;
    }

    public getIPCSource(): string {
        return "main";
    }

    public start(): void {
        this.registerModules();
        this.checkSettings();
        this.createAndShow();
        this.attachIpcHandler();




    }

    private checkSettings(): void {

        for (const module of this.activeModules) {
            const settingsMap: Map<string, any> = StorageHandler.readSettingsFromModuleStorage(module);

            const moduleSettings: ModuleSettings = module.getSettings();
            settingsMap.forEach((settingValue: any, settingName: string) => {
                const setting: Setting<unknown> = moduleSettings.getSettingByName(settingName);
                if (setting == undefined) {
                    console.log("WARNING: Invalid setting name: '" + settingName + "' found.");
                } else {
                    setting.setValue(settingValue);
                }
            });

            StorageHandler.writeModuleSettingsToStorage(module);
            this.settingsModule.addModuleSetting(module.getSettings());
        }

    }

    private init(): void {
        const map: Map<string, string> = new Map<string, string>();
        this.activeModules.forEach((module: Process) => {
            map.set(module.getModuleName(), module.getHtmlPath());
        });
        ipcCallback.notifyRenderer(this, 'load-modules', map);
        this.swapLayouts(HomeProcess.MODULE_NAME);
    }

    private attachIpcHandler(): void {
        IPCHandler.createHandler(this, (_, eventType: string, data: any[]) => {
            switch (eventType) {
                case "renderer-init": {
                    this.init();
                    break;
                }
                case "alert-main-swap-modules": {
                    this.swapLayouts(data[0]);
                    
                    break;
                }
            }
        });

        this.activeModules.forEach((module: Process) => {
            console.log("Registering " + module.getIPCSource() + "-process");
            this.ipc.on(module.getIPCSource() + "-process", (_, eventType: string, data: any[]) => {
                this.modulesByName.get(module.getModuleName()).receiveIPCEvent(eventType, data);
            })
        });
    }

    public stop(): void {
        this.activeModules.forEach((module: Process) => {
            module.stop();
        });
    }

    private swapLayouts(moduleName: string): void {
        const module: Process = this.modulesByName.get(moduleName);
        module.onGuiShown();
        ipcCallback.notifyRenderer(this, 'swap-modules-renderer', moduleName);
    }


    private createAndShow(): void {
        this.window = new BrowserWindow({
            height: WINDOW_DIMENSION.height,
            width: WINDOW_DIMENSION.width,
            webPreferences: {
                nodeIntegrationInSubFrames: true,
                backgroundThrottling: false,
                preload: path.join(__dirname, "preload.js"),
            },
        });
        this.window.loadFile(path.join(__dirname, "../index.html"));
        IPCHandler.construct(this.window, this.ipc);

    }

    private registerModules(): void {
        console.log("Registering modules...");

        this.addModule(new HomeProcess(ipcCallback));
        this.addModule(this.settingsModule);
        this.addModule(new VolumeControllerProcess(ipcCallback));

    }
    private addModule(module: Process): void {
        this.modulesByName.set(module.getModuleName(), module);
        this.activeModules.push(module);
    }



}