import { BrowserWindow } from "electron";
import { Dimension } from "./objects/Dimension";
import * as path from "path";
import { Module } from "./module_builder/Module";
import { SettingsModule } from "./built_ins/modules/settings_module/SettingsModule";
import { HomeModule } from "./built_ins/modules/home_module/HomeModule";
import { IPCHandler } from "./IPCHandler";
import { IPCCallback, IPCSource } from "./module_builder/IPCObjects";
import { StorageHandler } from "./StorageHandler";
import { ModuleSettings } from "./module_builder/ModuleSettings";
import { Setting } from "./module_builder/settings/Setting";
import { SampleModule } from "./sample_module/{MODULE_NAME}Module";

const WINDOW_DIMENSION: Dimension = new Dimension(1920, 1080);
const ipcCallback: IPCCallback = {
    notifyRenderer: IPCHandler.fireEventToRenderer.bind(IPCHandler)
}

export class ModuleController implements IPCSource {

    private window: BrowserWindow;
    private ipc: Electron.IpcMain;

    private modulesByName = new Map<string, Module>();
    private activeModules: Module[] = [];
    private settingsModule: SettingsModule = new SettingsModule(ipcCallback);

    public constructor(ipcHandler: Electron.IpcMain) {
        this.ipc = ipcHandler;
    }

    getIpcSource(): string {
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
        this.activeModules.forEach((module: Module) => {
            map.set(module.getModuleName(), module.getHtmlPath());
        });
        ipcCallback.notifyRenderer(this, 'load-modules', map);
        this.swapLayouts(HomeModule.MODULE_NAME);
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

        this.activeModules.forEach((module: Module) => {
            console.log("Registering " + module.getIpcSource() + "-process");
            this.ipc.on(module.getIpcSource() + "-process", (_, eventType: string, data: any[]) => {
                this.modulesByName.get(module.getModuleName()).recieveIpcEvent(eventType, data);
            })
        });
    }

    public stop(): void {
        this.activeModules.forEach((module: Module) => {
            module.stop();
        });
    }

    private swapLayouts(moduleName: string): void {
        const module: Module = this.modulesByName.get(moduleName);
        module.onGuiShown();
        ipcCallback.notifyRenderer(this, 'swap-modules-renderer', moduleName);
    }


    private createAndShow(): void {
        this.window = new BrowserWindow({
            height: WINDOW_DIMENSION.getHeight(),
            width: WINDOW_DIMENSION.getWidth(),
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

        this.addModule(new HomeModule(ipcCallback));
        this.addModule(this.settingsModule);
        this.addModule(new SampleModule(ipcCallback));

    }
    private addModule(module: Module): void {
        this.modulesByName.set(module.getModuleName(), module);
        this.activeModules.push(module);
    }



}