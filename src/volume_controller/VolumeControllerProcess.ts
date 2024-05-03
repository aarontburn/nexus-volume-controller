import * as path from "path";
import { Process } from "./module_builder/Process";
import { IPCCallback } from "./module_builder/IPCObjects";
import { NodeAudioVolumeMixer } from "node-audio-volume-mixer";
import { Setting } from "./module_builder/Setting";
import { BooleanSetting } from "./module_builder/settings/types/BooleanSetting";
import { exec as lameExec } from 'child_process'
import { promisify } from 'util';
import SoundMixer, { AudioSession, Device, DeviceType } from "native-sound-mixer";

const exec = promisify(lameExec);


interface Session {
    pid: number,
    name: string,
    volume: number,
    isMuted: boolean

}


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




    // private regex = /[^\u0000-\u00ff]/; // Small performance gain from pre-compiling the regex
    // private isValidUnicode(str: string) {
    //     if (!str.length || str.charCodeAt(0) > 255) {
    //         return false;
    //     }
    //     return !this.regex.test(str);
    // }

    private async nameFromPath(path: string) {
        if (!path) {
            return "System Volume";
        }

        try {
            const command = `(Get-Item "${path}").VersionInfo.FileDescription`
            const { stdout, stderr } = await exec(command, { 'shell': 'powershell.exe' });
            if (stdout) {
                return stdout.trim();
            }
            // console.log('stdout:', stdout);
            console.log('stderr:', stderr);
        } catch (e) {
            console.error(e); // should contain code (exit code) and signal (that caused the termination).
        }
        return null;
    }


    private pathToPIDMap: Map<string, number> = new Map();
    private pidToSessionMap: Map<number, Session> = new Map();

    private generatePID(): number {
        return Math.floor(Math.random() * 5);
    }


    private async getSessionInformation(): Promise<Session[]> {
        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);
        const sessions: AudioSession[] = masterDevice.sessions;

        const sessionList: Session[] = []

        sessions.forEach(async session => {
            const path = session.appName;
            const sessionName: string | null = await this.nameFromPath(path);

            if (!sessionName) {
                console.log("Error getting name for " + session);
                return;
            }
            // console.log()
            // console.log("Path: " + path);
            // console.log("Resolved Name: " + sessionName);
            // console.log("Internal Name: " + session.name)
            // console.log("Volume: " + session.volume)
            // console.log("Muted: " + session.mute)

            let newSession: boolean = false;
            let pid = this.pathToPIDMap.get(path);
            if (pid === undefined) {
                pid = this.generatePID();
                this.pathToPIDMap.set(path, pid);
                newSession = true;
            }

            const sessionObject: Session = {
                pid: pid,
                name: sessionName,
                volume: session.volume,
                isMuted: session.mute
            }
            if (newSession) {
                this.pidToSessionMap.set(pid, sessionObject);
            }
            sessionList.push(sessionObject);


        });
        return sessionList;

    }


    private async updateSessions() {
        // Master
        const masterInfo: { isMuted: boolean, volume: number } = {
            isMuted: this.isMasterMuted(),
            volume: this.getMasterVolume()
        }

        this.notifyObservers('master-update', masterInfo);


        // Individual sessions
        await this.getSessionInformation().then((sessions: Session[]) => {

        });



        // const sessions: any[] = NodeAudioVolumeMixer.getAudioSessionProcesses();

        // const updatedSessions: { pid: number, name: string, volume: number, isMuted: boolean }[] = [];
        // sessions.forEach((session) => {
        //     if (session.pid === 0) {
        //         session.name = "System Volume";
        //     }

        //     if (!this.isValidUnicode(session.name)) {
        //         exec(command, (err, stdout, stderr) =>{
        //             if (err) {
        //                 console.error(err);
        //                 return;
        //             }

        //             console.log("out: " + stdout)
        //             console.log("err: " + stderr)
        //         });
        //     }

        //     updatedSessions.push({ ...session, volume: this.getSessionVolume(session.pid), isMuted: this.isSessionMuted(session.pid) })
        // });

        // this.notifyObservers("vol-sessions", ...updatedSessions);
        // this.refreshTimeout = setTimeout(() => this.updateSessions(), VolumeControllerProcess.VOLUME_REFRESH_MS);
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
                this.setMasterVolume(newMasterVolume / 100);
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
        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);
        return masterDevice.volume;

        return NodeAudioVolumeMixer.getMasterVolumeLevelScalar();
    }

    private setMasterVolume(volume: number): void {
        if (volume > 1 || volume < 0) {
            console.log("ERROR (VolumeControllerModule): Volume out of range 0.0 - 1.0: " + volume + " for master")
            return;
        }
        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);
        masterDevice.volume = volume

        // NodeAudioVolumeMixer.setMasterVolumeLevelScalar(volume);
    }

    private isMasterMuted(): boolean {
        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);
        return masterDevice.mute;
        return NodeAudioVolumeMixer.isMasterMuted();
    }

    private setMasterMuted(isMuted: boolean): void {
        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);
        masterDevice.mute = isMuted;
        // NodeAudioVolumeMixer.muteMaster(isMuted);
    }



}