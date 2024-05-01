import * as path from "path";
import { StorageHandler } from "../../StorageHandler";
import { IPCCallback } from "../../volume_controller/module_builder/IPCObjects";
import { ModuleSettings } from "../../volume_controller/module_builder/ModuleSettings";
import { Process } from "../../volume_controller/module_builder/Process";
import { Setting } from "../../volume_controller/module_builder/Setting";
import { SettingBox } from "../../volume_controller/module_builder/SettingBox";
import { BooleanSetting } from "../../volume_controller/module_builder/settings/types/BooleanSetting";
import { HexColorSetting } from "../../volume_controller/module_builder/settings/types/HexColorSetting";

export class SettingsProcess extends Process {
    public static MODULE_NAME: string = "Settings";
    private static HTML_PATH: string = path.join(__dirname, "./SettingsHTML.html").replace("dist", "src");

    private moduleSettingsList: ModuleSettings[] = [];

    public constructor(ipcCallback: IPCCallback) {
        super(SettingsProcess.MODULE_NAME, SettingsProcess.HTML_PATH, ipcCallback);
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
                    inputType: settingBox.getInputType(),
                    interactiveIds: settingBox.getInteractiveIds(),
                    ui: settingBox.getUI(),
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


    public receiveIPCEvent(eventType: string, data: any[]): void {
        switch (eventType) {
            case "settings-init": {
                this.initialize();
                break;
            }

            case "swap-settings-tab": {
                const moduleName: string = data[0];

                for (const moduleSettings of this.moduleSettingsList) {
                    const name: string = moduleSettings.getModuleSettingsName();

                    if (moduleName !== name) {
                        continue;
                    }

                    const settingsList: Setting<unknown>[] = moduleSettings.getSettingsList();
                    const list: any = { module: moduleName, settings: [] };
                    settingsList.forEach((setting: Setting<unknown>) => {
                        const settingBox: SettingBox<unknown> = setting.getUIComponent();
                        const settingInfo: any = {
                            inputType: settingBox.getInputType(),
                            interactiveIds: settingBox.getInteractiveIds(),
                            ui: settingBox.getUI(),
                            style: settingBox.getStyle(),
                            attribute: settingBox.getAttribute(),
                        };
                        list.settings.push(settingInfo);
                    });


                    this.notifyObservers('swap-tab', list);


                }

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
                                setting.getParentModule().refreshSettings();
                                StorageHandler.writeModuleSettingsToStorage(setting.getParentModule());
                                this.notifyObservers("setting-modified", elementId, setting.getValue());
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