import { Process } from "./Process";
import { Setting } from "./Setting";



/**
 *  Class to manage module settings.
 * 
 *  @author aarontburn
 */
export class ModuleSettings {
    public readonly settingsMap: Map<string, Setting<unknown>> = new Map();
    public readonly settingsDisplay: (Setting<unknown> | string)[] = [];
    public readonly parentModule: Process;
    public settingsName: string;

    public constructor(module: Process) {
        this.parentModule = module;
    }

    /**
     *  Get the name of the module settings. 
     *  
     *  If it isn't set, which is default, it will return the name
     *      of the parent module. Only change this if you need to modify how
     *      the name of the settings appears.
     * 
     *  @see setName(name)
     *  @returns The name of the settings.
     */
    public getName(): string {
        return this.settingsName === undefined
            ? this.parentModule.getName()
            : this.settingsName;
    }

    /**
     *  @returns An array of all the settings.
     */
    public getSettings(): Setting<unknown>[] {
        const settingList: Setting<unknown>[] = [];

        for (const s of this.settingsDisplay) {
            if (s instanceof Setting) {
                settingList.push(s);
            }
        }

        return settingList;
    }

    public getSettingsAndHeaders(): (Setting<unknown> | string)[] {
        return this.settingsDisplay;
    }

    /**
     *  Modify the name of the setting group.
     *  
     *  Under normal conditions, there are very few reasons to change this.
     * 
     *  @see getName
     *  @param name The name of the settings group.
     */
    public setName(name: string): void {
        this.settingsName = name;
    }

    /**
     *  Adds a setting.
     * 
     *  Registers the setting under both its name and ID, if set.
     * 
     *  @param setting The setting to add.
     */
    public addSetting(s: Setting<unknown> | string): void {
        this.settingsDisplay.push(s);
        if (typeof s === 'string') {
            return;
        }


        const setting = s as Setting<unknown>;
        const settingID: string = setting.getAccessID();
        const settingName: string = setting.getName();

        if (settingID === settingName) { // No ID was set, or they used the same ID as the setting name.
            this.settingsMap.set(settingID, setting);
            return;
        }

        this.settingsMap.set(settingID, setting);
        this.settingsMap.set(settingName, setting);
    }

    /**
     *  Add multiple settings.
     * 
     *  @param settings The settings to add. 
     */
    public addSettings(settings: (Setting<unknown> | string)[]): void {
        settings.forEach((setting: Setting<unknown> | string) => {
            this.addSetting(setting);
        });
    }

    /**
     *  Search for a setting by either name or ID. 
     * 
     *  @param name The name or ID of the setting
     *  @returns The setting, or undefined if not found.
     */
    public getSetting(name: string): Setting<unknown> | undefined {
        return this.settingsMap.get(name);
    }

    /**
     *  @returns A reference to the parent module.
     */
    public getModule(): Process {
        return this.parentModule;
    }




}