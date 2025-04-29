import * as path from "path";
import { SessionController } from "./SessionController";
import { BooleanSetting } from "@nexus-app/nexus-module-builder/settings/types";
import { Process, Setting } from "@nexus-app/nexus-module-builder";

const MODULE_ID: string = "{EXPORTED_MODULE_ID}";
const MODULE_NAME: string = "{EXPORTED_MODULE_NAME}";
const HTML_PATH: string = path.join(__dirname, "../renderer/index.html");

export default class VolumeControllerProcess extends Process {


    private static readonly BACKGROUND_MUTE_FILE_NAME: string = 'bg_mute_paths.txt';

    private static readonly VOLUME_REFRESH_MS: number = 1000;

    private refreshTimeout: NodeJS.Timeout;

    public constructor() {
		super({
			moduleID: MODULE_ID,
			moduleName: MODULE_NAME,
			paths: {
				htmlPath: HTML_PATH,
			}
		});
    }

    public async initialize(): Promise<void> {
        await super.initialize()
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



    public registerSettings(): (Setting<unknown> | string)[] {
        return [
            new BooleanSetting(this)
                .setAccessID('show_pid')
                .setName("Show Session PID")
                .setDescription("Displays the process ID of the session.")
                .setDefault(false)

        ];
    }


    public async onSettingModified(modifiedSetting?: Setting<unknown>): Promise<void> {
        if (modifiedSetting?.getAccessID() === 'show_pid') {
            this.sendToRenderer("session-pid-visibility-modified", this.getSettings().findSetting("show_pid").getValue());
        }
    }

    public async onExit(): Promise<void> {
        clearTimeout(this.refreshTimeout);
    }


    public async handleEvent(eventType: string, data: any[]): Promise<any> {
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
                await this.writeBackgroundMuteToStorage();
                break;
            }
            case "session-lock": {
                SessionController.setSessionLock(Number(data[0]));
                break;
            }
        }
    }

    private async getBGMuteFromStorage(): Promise<void> {
        const contents: string | null = await this.fileManager.readFromStorage(VolumeControllerProcess.BACKGROUND_MUTE_FILE_NAME);

        if (contents === null) {
            return;
        }

        SessionController.init(new Set(contents.split("\n").filter(s => s)));

    }


    private async writeBackgroundMuteToStorage(): Promise<void> {
        let output: string = '';

        const paths: Set<string> = SessionController.getBGMutePaths();
        paths.forEach(s => {
            if (s !== '') {
                output += s + "\n";
            }
        });

        await this.fileManager.writeToStorage(
            VolumeControllerProcess.BACKGROUND_MUTE_FILE_NAME,
            output.trim());

    }

}