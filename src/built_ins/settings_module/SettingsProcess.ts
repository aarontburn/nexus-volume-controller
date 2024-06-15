import * as path from "path";
import { shell } from 'electron';
import { Process } from "../../volume_controller/module_builder/Process";
import { IPCCallback } from "../../volume_controller/module_builder/IPCObjects";
import { ModuleSettings } from "../../volume_controller/module_builder/ModuleSettings";
import { Setting } from "../../volume_controller/module_builder/Setting";
import { SettingBox, InputElement, ChangeEvent } from "../../volume_controller/module_builder/SettingBox";
import { StorageHandler } from "../../volume_controller/module_builder/StorageHandler";
import { BooleanSetting } from "../../volume_controller/module_builder/settings/types/BooleanSetting";
import { HexColorSetting } from "../../volume_controller/module_builder/settings/types/HexColorSetting";

export class SettingsProcess extends Process {
    public static MODULE_NAME: string = "Settings";
    private static HTML_PATH: string = path.join(__dirname, "./SettingsHTML.html").replace("dist", 'src');

    private moduleSettingsList: ModuleSettings[] = [];

    public constructor(ipcCallback: IPCCallback) {
        super(
            SettingsProcess.MODULE_NAME,
            SettingsProcess.HTML_PATH,
            ipcCallback);

        this.getSettings().setName("General");
        this.setModuleInfo({
            moduleName: "General",
            author: "aarontburn",
            version: "1.0.0",
            description: "General settings.",
            buildVersion: 1,
            platforms: []
        })
    }

    public registerSettings(): Setting<unknown>[] {
        return [
            new HexColorSetting(this)
                .setName("Accent Color")
                .setAccessID("accent_color")
                .setDescription("Changes the color of various elements.")
                .setDefault("#2290B5"),
                

            new BooleanSetting(this)
                .setName("Force Reload Modules at Launch")
                .setDescription("Always recompile modules at launch. Will result in a slower boot.")
                .setAccessID("force_reload")
                .setDefault(false),
        ];
    }

    public refreshSettings(): void {
        this.sendToRenderer("refresh-settings", this.getSettings().getSetting("accent_color").getValue());

    }

    public initialize(): void {
        super.initialize();


        const settings: any[] = [];
        for (const moduleSettings of this.moduleSettingsList) {
            const moduleName: string = moduleSettings.getName();
            const settingsList: Setting<unknown>[] = moduleSettings.getSettingsList();

            const list: any = {
                module: moduleName,
                moduleInfo: moduleSettings.getModule().getModuleInfo(),
                settings: []
            };

            settingsList.forEach((setting: Setting<unknown>) => {
                const settingInfo: any = {
                    moduleInfo: setting.parentModule.getModuleInfo(),
                    settingId: setting.getID(),
                };
                list.settings.push(settingInfo);
            });
            settings.push(list);
            moduleSettings.getModule().refreshSettings();
        }

        // this.refreshSettings();
        this.sendToRenderer("populate-settings-list", settings);
    }

    // TODO: Restructure stuff 
    private onSettingChange(settingId: string, newValue?: any): void {
        for (const moduleSettings of this.moduleSettingsList) {
            const settingsList: Setting<unknown>[] = moduleSettings.getSettingsList();

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
                        console.log("Final setting value: " + setting.getValue())
                        setting.getParentModule().refreshSettings();
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

                    const settingsList: Setting<unknown>[] = moduleSettings.getSettingsList();
                    const list: any = {
                        module: moduleName,
                        moduleInfo: moduleSettings.getModule().getModuleInfo(),
                        settings: []
                    };

                    settingsList.forEach((setting: Setting<unknown>) => {
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
                console.log(data)
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