import { Setting } from "../../../module_builder/settings/Setting";
import { Module } from "../../../module_builder/Module";
import * as path from "path";
import { ModuleSettings } from "../../../module_builder/ModuleSettings";
import { SettingBox } from "../../../module_builder/settings/SettingBox";
import { BooleanSetting } from "../../../built_ins/settings/types/BooleanSetting";
import { HexColorSetting } from "../../../built_ins/settings/types/HexColorSetting";
import { StorageHandler } from "../../../StorageHandler";
import { IPCCallback } from "../../../module_builder/IPCObjects";

export class SettingsModule extends Module {
    public static MODULE_NAME: string = "Settings";
    private static HTML_PATH: string = path.join(__dirname, "./SettingsHTML.html").replace("dist", "src");

    private moduleSettingsList: ModuleSettings[] = [];

    public constructor(ipcCallback: IPCCallback) {
        super(SettingsModule.MODULE_NAME, SettingsModule.HTML_PATH, ipcCallback);
        this.getSettings().setSettingsName("General");
    }

    public registerSettings(): Setting<unknown>[] {
        return [
            new BooleanSetting(this)
                .setName("test boolean")
                .setDescription("test boolean")
                .setDefault(false),

            new HexColorSetting(this)
                .setName("Accent Color")
                .setDefault("#2290B5"),


        ];
    }

    public refreshSettings(): void {
        this.notifyObservers("refresh-settings", this.getSettings().getSettingByName("Accent Color").getValue());

    }

    public initialize(): void {
        super.initialize();


        const settings: any[] = [];
        for (const moduleSettings of this.moduleSettingsList) {
            const moduleName: string = moduleSettings.getModuleSettingsName();
            const settingsList: Setting<unknown>[] = moduleSettings.getSettingsList();

            const list: any = { module: moduleName, settings: [] };

            settingsList.forEach((setting: Setting<unknown>) => {
                const settingBox: SettingBox<unknown> = setting.getUIComponent();
                const settingInfo: any = {
                    interactiveIds: settingBox.getInteractiveIds(),
                    ui: settingBox.getUI(),
                    eventType: settingBox.getEventType(),
                    style: settingBox.getStyle(),
                    attribute: settingBox.getAttribute(),
                };
                list.settings.push(settingInfo);
            });
            settings.push(list);
        }

        // this.refreshSettings();
        this.notifyObservers("populate-settings-list", settings);

    }


    public recieveIpcEvent(eventType: string, data: any[]): void {
        switch (eventType) {
            case "settings-init": {
                this.initialize();
                break;
            }
            case "setting-modified": {
                const elementId: string = data[0];
                const elementValue: string = data[1];

                for (const moduleSettings of this.moduleSettingsList) {
                    const settingsList: Setting<unknown>[] = moduleSettings.getSettingsList();

                    settingsList.forEach((setting: Setting<unknown>) => {
                        const settingBox: SettingBox<unknown> = setting.getUIComponent();

                        settingBox.getInteractiveIds().forEach((id: string) => {
                            if (id == elementId) { // found the modified setting
                                setting.setValue(elementValue);
                                StorageHandler.writeModuleSettingsToStorage(setting.getParentModule());
                                this.notifyObservers("setting-modified", elementId, setting.getValue());
                                setting.getParentModule().refreshSettings();
                                return;
                            }
                        });
                    });
                }

                break;
            }
        }
    }

    public addModuleSetting(moduleSettings: ModuleSettings): void {
        this.moduleSettingsList.push(moduleSettings);
    }

}