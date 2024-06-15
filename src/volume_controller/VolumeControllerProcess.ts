import * as path from "path";
import { Process } from "./module_builder/Process";
import { IPCCallback } from "./module_builder/IPCObjects";
import { Setting } from "./module_builder/Setting";
import { BooleanSetting } from "./module_builder/settings/types/BooleanSetting";
import { SessionController } from "./SessionController";
import { StorageHandler } from "./module_builder/StorageHandler";




export class VolumeControllerProcess extends Process {

    private static MODULE_NAME = "Volume Controller";

    // Modify this to match the path of your HTML file.
    /** @htmlpath */
    private static HTML_PATH: string = path.join(__dirname, "./VolumeControllerHTML.html").replace("dist", "src");

    private static BACKGROUND_MUTE_FILE_NAME = 'bg_mute_paths.txt';



    private static VOLUME_REFRESH_MS = 1000;

    private refreshTimeout: NodeJS.Timeout;

    public constructor(ipcCallback: IPCCallback) {
        super(VolumeControllerProcess.MODULE_NAME, VolumeControllerProcess.HTML_PATH, ipcCallback);
    }

    public initialize(): void {
        super.initialize()
        // Get a audio session.
        this.getBGMuteFromStorage();


        this.updateSessions();
    }


    private async updateSessions() {

        // Master
        const masterInfo: { isMuted: boolean, volume: number } = {
            isMuted: SessionController.isMasterMuted(),
            volume: SessionController.getMasterVolume()
        };

        this.sendToRenderer('master-update', masterInfo);


        const [sessions, soloedSession]: [Session[], Session] = SessionController.getSessions();
        this.sendToRenderer("vol-sessions", sessions);
        this.sendToRenderer("soloed-track", soloedSession);

        this.refreshTimeout = setTimeout(() => this.updateSessions(), VolumeControllerProcess.VOLUME_REFRESH_MS);

    }



    public registerSettings(): Setting<unknown>[] {
        return [
            new BooleanSetting(this)
                .setName("Show Session PID")
                .setDescription("Displays the process ID of the session.")
                .setDefault(false)

        ];
    }


    public refreshSettings(): void {
        this.sendToRenderer("session-pid-visibility-modified", this.getSettings().getSetting("Show Session PID").getValue());
    }

    public stop(): void {
        clearTimeout(this.refreshTimeout);
    }


    public handleEvent(eventType: string, data: any[]): void {
        switch (eventType) {
            case "init": {
                this.initialize();
                break;
            }
            case "volume-modified": {
                const sessionPID: number = Number(data[0]);
                const newVolume: number = Number(data[1]) / 100;
                console.log("PID: " + data[0] + " New Volume: " + data[1])
                SessionController.setSessionVolume(sessionPID, newVolume);
                break;
            }
            case "session-mute": {
                const sessionPID: number = Number(data[0]);
                SessionController.setSessionMute(sessionPID, !SessionController.isSessionMuted(sessionPID));
                console.log("Toggling mute for session: " + sessionPID);
                break;
            }
            case "session-solo": {
                const sessionPID: number = Number(data[0]);
                SessionController.toggleSolo(sessionPID);
                break;
            }
            case "master-volume-modified": {
                const newMasterVolume: number = Number(data[0]);
                SessionController.setMasterVolume(newMasterVolume / 100);
                break;
            }
            case 'session-mute-state': {
                const isMasterMuted: boolean = Boolean(data[0]);
                SessionController.setMasterMute(isMasterMuted);
                break;
            }
            case "mute-unfocused": {
                SessionController.toggleUnfocusedSession(Number(data[0]));
                this.writeBackgroundMuteToStorage();
                break;
            }
            case "session-lock": {
                SessionController.setSessionLock(Number(data[0]));
                break;
            }
        }
    }

    private getBGMuteFromStorage(): void {
        const contents: string | null = StorageHandler.readFromModuleStorage(this, VolumeControllerProcess.BACKGROUND_MUTE_FILE_NAME);

        if (contents === null) {
            return;
        }

        SessionController.init(new Set(contents.split("\n").filter(s => s)));

    }


    private writeBackgroundMuteToStorage(): void {
        let output: string = '';

        const paths: Set<string> = SessionController.getBGMutePaths();
        paths.forEach(s => {
            if (s !== '') {
                output += s + "\n";
            } 
        });

        StorageHandler.writeToModuleStorage(
            this, 
            VolumeControllerProcess.BACKGROUND_MUTE_FILE_NAME, 
            output.trim());

    }

}