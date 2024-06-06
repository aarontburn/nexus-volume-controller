import fs from "fs";
import { app } from 'electron';
import { Process } from "./Process";
import { Setting } from "./Setting";

export class StorageHandler {
    private static PATH: string = app.getPath("home") + "/.modules/";
    private static STORAGE_PATH: string = this.PATH + "/storage/";
    private static EXTERNAL_MODULES_PATH: string = this.PATH + "/external_modules/"
    private static COMPILED_MODULES_PATH: string = this.PATH + "/built/"

    public static async createDirectories(): Promise<void> {
        await fs.promises.mkdir(this.STORAGE_PATH, { recursive: true })
        await fs.promises.mkdir(this.EXTERNAL_MODULES_PATH, { recursive: true })
        await fs.promises.mkdir(this.COMPILED_MODULES_PATH, { recursive: true })
    }

    public static async writeToModuleStorage(theModule: Process, theFileName: string, theContents: string): Promise<void> {
        const dirName: string = theModule.getModuleName().toLowerCase();
        const folderName: string = this.STORAGE_PATH + dirName + "/";
        const filePath: string = folderName + theFileName;

        await fs.promises.mkdir(folderName, { recursive: true });
        await fs.promises.writeFile(filePath, theContents);

    }

    public static writeModuleSettingsToStorage(theModule: Process): void {
        const settingMap: Map<string, any> = new Map();

        theModule.getSettings().getSettingsList().forEach((setting: Setting<unknown>) => {
            settingMap.set(setting.getSettingName(), setting.getValue());
        })

        this.writeToModuleStorage(theModule, theModule.getSettingsFileName(), JSON.stringify(Object.fromEntries(settingMap)));
    }


    public static readFromModuleStorage(theModule: Process, theFileName: string, encoding?: string): string | null {
        if (encoding === undefined) {
            encoding = "utf-8";
        }

        const dirName: string = theModule.getModuleName().toLowerCase();
        const folderName: string = this.STORAGE_PATH + dirName + "/";
        const filePath: string = folderName + theFileName;

        try {
            const content = fs.readFileSync(filePath, { encoding: (encoding as BufferEncoding) });
            return content;
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }

            console.log("File not found: " + filePath);
        }

        return null

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

            console.log("WARNING: directory not found.");
            return settingMap;
        }

        const json: any = JSON.parse(contents);
        for (const settingName in json) {
            settingMap.set(settingName, json[settingName]);
        }
        return settingMap;
    }

}