import * as path from "path";
import { BrowserWindow, shell } from 'electron';
import { IPCCallback } from "../../volume_controller/module_builder/IPCObjects";
import { ModuleSettings } from "../../volume_controller/module_builder/ModuleSettings";
import { Process } from "../../volume_controller/module_builder/Process";
import { Setting } from "../../volume_controller/module_builder/Setting";
import { SettingBox, InputElement, ChangeEvent } from "../../volume_controller/module_builder/SettingBox";
import { StorageHandler } from "../../volume_controller/module_builder/StorageHandler";
import { BooleanSetting } from "../../volume_controller/module_builder/settings/types/BooleanSetting";
import { HexColorSetting } from "../../volume_controller/module_builder/settings/types/HexColorSetting";
import { NumberSetting } from "../../volume_controller/module_builder/settings/types/NumberSetting";

export class SettingsProcess extends Process {
    public static MODULE_NAME: string = "Settings";
    private static HTML_PATH: string = path.join(__dirname, "./SettingsHTML.html").replace('dist', 'src');

    private moduleSettingsList: ModuleSettings[] = [];
    private window: BrowserWindow;

    public constructor(ipcCallback: IPCCallback, window: BrowserWindow) {
        super(
            SettingsProcess.MODULE_NAME,
            SettingsProcess.HTML_PATH,
            ipcCallback);
        this.window = window;

        this.getSettings().setName("General");
        this.setModuleInfo({
            moduleName: "General",
            author: "aarontburn",
            description: "General settings.",
        });
    }

    public registerSettings(): (Setting<unknown> | string)[] {
        return [
            "Display",
            new HexColorSetting(this)
                .setName("Accent Color")
                .setAccessID("accent_color")
                .setDescription("Changes the color of various elements.")
                .setDefault("#2290B5"),

            new NumberSetting(this)
                .useIncrementableUI()
                .setRange(25, 300)
                .setStep(10)
                .setName("Zoom Level")
                .setDefault(100)
                .setAccessID('zoom'),
        ];
    }


    public refreshSettings(modifiedSetting?: Setting<unknown>): void {
        if (modifiedSetting?.getAccessID() === 'zoom') {
            const zoom: number = modifiedSetting.getValue() as number;
            this.window.webContents.setZoomFactor(zoom / 100);

        } else if (modifiedSetting?.getAccessID() === 'accent_color') {
            this.sendToRenderer("refresh-settings", modifiedSetting.getValue());
        }
    }

    public initialize(): void {
        super.initialize();

        const settings: any[] = [];
        for (const moduleSettings of this.moduleSettingsList) {
            const moduleName: string = moduleSettings.getName();

            const list: { module: string, moduleInfo: any } = {
                module: moduleName,
                moduleInfo: moduleSettings.getModule().getModuleInfo(),
            };

            settings.push(list);
            moduleSettings.getModule().refreshAllSettings();
        }

        // this.refreshSettings();
        this.sendToRenderer("populate-settings-list", settings);
    }

    // TODO: Restructure stuff 
    private onSettingChange(settingId: string, newValue?: any): void {
        for (const moduleSettings of this.moduleSettingsList) {
            const settingsList: Setting<unknown>[] = moduleSettings.getSettings();

            settingsList.forEach((setting: Setting<unknown>) => {
                const settingBox: SettingBox<unknown> = setting.getUIComponent();
                settingBox.getInputIdAndType().forEach((group: InputElement) => {
                    const id: string = group.id;
                    if (id === settingId) { // found the modified setting
                        if (newValue === undefined) {
                            setting.resetToDefault();
                        } else {
                            setting.setValue(newValue);
                        }
                        setting.getParentModule().refreshSettings(setting);
                        const update: ChangeEvent[] = settingBox.onChange(setting.getValue());
                        StorageHandler.writeModuleSettingsToStorage(setting.getParentModule());
                        this.sendToRenderer("setting-modified", update);
                        return;
                    }
                });
            });
        }

    }


    public handleEvent(eventType: string, data: any[]): void {
        switch (eventType) {
            case "settings-init": {
                this.initialize();
                break;
            }

            case "swap-settings-tab": {
                const moduleName: string = data[0];

                for (const moduleSettings of this.moduleSettingsList) {
                    const name: string = moduleSettings.getName();

                    if (moduleName !== name) {
                        continue;
                    }

                    const settingsList: (Setting<unknown> | string)[] = moduleSettings.getSettingsAndHeaders();
                    const list: any = {
                        module: moduleName,
                        moduleInfo: moduleSettings.getModule().getModuleInfo(),
                        settings: []
                    };

                    settingsList.forEach((s: (Setting<unknown> | string)) => {
                        if (typeof s === 'string') {
                            list.settings.push(s);
                            return;
                        }

                        const setting: Setting<unknown> = s as Setting<unknown>;
                        const settingBox: SettingBox<unknown> = setting.getUIComponent();
                        const settingInfo: any = {
                            settingId: setting.getID(),
                            inputTypeAndId: settingBox.getInputIdAndType(),
                            ui: settingBox.getUI(),
                            style: [settingBox.constructor.name + 'Styles', settingBox.getStyle()],
                        };
                        list.settings.push(settingInfo);
                    });


                    this.sendToRenderer('swap-tab', list);


                }

                break;
            }

            case "setting-modified": {
                const elementId: string = data[0];
                const elementValue: string = data[1];
                this.onSettingChange(elementId, elementValue);

                break;
            }

            case 'setting-reset': {
                const settingId: string = data[0];
                console.log("Resetting:" + settingId);
                this.onSettingChange(settingId);


                break;
            }
            case 'open-link': {
                const link: string = data[0];
                shell.openExternal(link);

                break;
            }
        }
    }

    public addModuleSetting(moduleSettings: ModuleSettings): void {
        this.moduleSettingsList.push(moduleSettings);
    }

}