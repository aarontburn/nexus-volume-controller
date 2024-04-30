import fs from "fs";
import { app } from 'electron';
import path from "path"
import { Process } from "./volume_controller/module_builder/Process";
import { Setting } from "./volume_controller/module_builder/Setting";

export class StorageHandler {
    private static PATH: string = app.getPath("home") + "/.modules/";
    private static STORAGE_PATH: string = this.PATH + "/storage/";



    public static writeToModuleStorage(theModule: Process, theFileName: string, theContents: string): void {
        const dirName: string = theModule.getModuleName().toLowerCase();
        const folderName: string = this.STORAGE_PATH + dirName + "/";
        const filePath: string = folderName + theFileName;


        const write = async () => {
            await fs.mkdir(folderName,
                { recursive: true },
                (err: NodeJS.ErrnoException) => {
                    if (err != null) {
                        console.log("Error creating directories:")
                        console.log(err)
                        return;
                    }
                    fs.writeFile(`${filePath}`, theContents, (err: NodeJS.ErrnoException) => {
                        if (err != null) {
                            console.log("Error writing to module storage:")
                            console.log(err);
                        }
                    });
                });
        }
        write()
    }


    public static writeModuleSettingsToStorage(theModule: Process): void {
        const settingMap: Map<string, any> = new Map();

        theModule.getSettings().getSettingsList().forEach((setting: Setting<unknown>) => {
            settingMap.set(setting.getSettingName(), setting.getValue());
        })

        this.writeToModuleStorage(theModule, theModule.getSettingsFileName(), JSON.stringify(Object.fromEntries(settingMap)));
    }


    public static readSettingsFromModuleStorage(theModule: Process): Map<string, any> {
        const settingMap: Map<string, any> = new Map();

        const dirName: string = theModule.getModuleName().toLowerCase();
        const folderName: string = this.STORAGE_PATH + dirName + "/";
        const filePath: string = folderName + theModule.getSettingsFileName();


        let contents: string;
        try {
            contents = fs.readFileSync(filePath, 'utf-8');
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }

            console.log("WARNING: directory not found.")
            return settingMap;
        }


        const json: any = JSON.parse(contents);
        for (const settingName in json) {
            settingMap.set(settingName, json[settingName]);
        }
        return settingMap;
    }

}