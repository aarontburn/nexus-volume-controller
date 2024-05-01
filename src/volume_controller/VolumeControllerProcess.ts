import * as path from "path";
import { Process } from "./module_builder/Process";
import { IPCCallback } from "./module_builder/IPCObjects";
import { NodeAudioVolumeMixer } from "node-audio-volume-mixer";
import { Setting } from "./module_builder/Setting";
import { BooleanSetting } from "./module_builder/settings/types/BooleanSetting";


export class VolumeControllerProcess extends Process {

    private static MODULE_NAME = "Volume Controller";

    // Modify this to match the path of your HTML file.
    /** @htmlpath */
    private static HTML_PATH: string = path.join(__dirname, "./VolumeControllerHTML.html").replace("dist", "src");


    private static VOLUME_REFRESH_MS = 500;

	private refreshTimeout: NodeJS.Timeout;

    public constructor(ipcCallback: IPCCallback) {
        super(VolumeControllerProcess.MODULE_NAME, VolumeControllerProcess.HTML_PATH, ipcCallback);
    }

    public initialize(): void {
        super.initialize()
        // Get a audio session.

        // exec('wmic process get ProcessID, CommandLine | find "Discord"', (err, stdout, stderr) =>{
        //     const lines = stdout.toString().split('\n')
        //     lines.forEach(line => {
        //         const parts = line.split('\t');
        //         parts.forEach(items => {
        //             console.log(items);
        //         })
        //     });
        // });

        this.updateSessions();
        this.refreshTimeout = setTimeout(() => this.updateSessions(), VolumeControllerProcess.VOLUME_REFRESH_MS);
    }

    private updateSessions() {
        // Master
        const masterInfo: { isMuted: boolean, volume: number } = {
            isMuted: this.isMasterMuted(),
            volume: this.getMasterVolume()
        }

        this.notifyObservers('master-update', masterInfo)


        // Individual sessions
        const sessions = NodeAudioVolumeMixer.getAudioSessionProcesses();

        const updatedSessions: { pid: number, name: string, volume: number, isMuted: boolean }[] = [];
        sessions.forEach((session) => {
            if (session.pid === 0) {
                session.name = "System Volume"
            }
            updatedSessions.push({ ...session, volume: this.getSessionVolume(session.pid), isMuted: this.isSessionMuted(session.pid) })
        });
        this.notifyObservers("vol-sessions", ...updatedSessions);
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
        this.notifyObservers("session-pid-visibility-modified", this.getSettings().getSettingByName("Show Session PID").getValue());
    }

    public stop(): void {
        clearTimeout(this.refreshTimeout);
    }



    public receiveIPCEvent(eventType: string, data: any[]): void {
        switch (eventType) {
            case "init": {
                this.initialize();
                break;
            }
            case "volume-modified": {
                const sessionPID: number = Number(data[0]);
                const newVolume: number = Number(data[1]) / 100;
                console.log("PID: " + data[0] + " New Volume: " + data[1])
                this.setSessionVolume(sessionPID, newVolume);
                break;
            }
            case "session-muted": {
                const sessionPID: number = Number(data);
                this.setSessionMuted(sessionPID, !this.isSessionMuted(sessionPID));
                console.log("Toggling mute for session: " + sessionPID);
                break;
            }
            case "session-solo": {
                const sessionPID: number = Number(data);
                this.toggleSolo(sessionPID);
                break;
            }
            case "master-volume-modified": {
                const newMasterVolume: number = Number(data[0]);
                this.setMasterVolume(newMasterVolume/ 100);
                break;
            }
            case 'session-mute-state': {
                const isMasterMuted: boolean = Boolean(data[0]);
                this.setMasterMuted(isMasterMuted);

                break;
            }

        }
    }

    private toggleSolo(pid: number): void {
        const sessions = NodeAudioVolumeMixer.getAudioSessionProcesses();
        let allMuted = true;

        sessions.forEach(session => {
            if (session.pid !== pid && !this.isSessionMuted(session.pid)) {
                allMuted = false;
            }
        });

        if (allMuted) {
            if (!this.isSessionMuted(pid)) { // Solo already applied, remove it
                sessions.forEach(sessions => {
                    this.setSessionMuted(sessions.pid, false);
                });
            } else { // Everything including the solo session is muted. Unmute solo
                this.setSessionMuted(pid, false);
            }
        } else { // Apply solo
            sessions.forEach(session => {
                if (session.pid !== pid) {
                    this.setSessionMuted(session.pid, true);
                }
            });


        }
        console.log("Toggling mute for session: " + pid);
    }



    private setSessionVolume(pid: number, volume: number): void {
        if (volume > 1 || volume < 0) {
            console.log("ERROR (VolumeControllerModule): Volume out of range 0.0 - 1.0: " + volume + " for PID " + pid)
            return;
        }
        NodeAudioVolumeMixer.setAudioSessionVolumeLevelScalar(pid, volume);
    }


    private getSessionVolume(pid: number): number {
        return NodeAudioVolumeMixer.getAudioSessionVolumeLevelScalar(pid);
    }

    private setSessionMuted(pid: number, isMuted: boolean): void {
        NodeAudioVolumeMixer.setAudioSessionMute(pid, isMuted);
    }

    private isSessionMuted(pid: number): boolean {
        return NodeAudioVolumeMixer.isAudioSessionMuted(pid);
    }


    private getMasterVolume(): number {
        return NodeAudioVolumeMixer.getMasterVolumeLevelScalar();
    }

    private setMasterVolume(volume: number): void {
        if (volume > 1 || volume < 0) {
            console.log("ERROR (VolumeControllerModule): Volume out of range 0.0 - 1.0: " + volume + " for master")
            return;
        }
        NodeAudioVolumeMixer.setMasterVolumeLevelScalar(volume);
    }

    private isMasterMuted(): boolean {
        return NodeAudioVolumeMixer.isMasterMuted();
    }

    private setMasterMuted(isMuted: boolean): void {
        NodeAudioVolumeMixer.muteMaster(isMuted);
    }



}