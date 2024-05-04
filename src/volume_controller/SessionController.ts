import { exec as lameExec } from 'child_process'
import { promisify } from 'util';
import SoundMixer, { AudioSession, Device, DeviceType } from "native-sound-mixer";
import { NodeAudioVolumeMixer } from "node-audio-volume-mixer";
import * as crypto from 'crypto';


const exec = promisify(lameExec);


export interface Session {
    pid: number,
    name: string,
    volume: number,
    isMuted: boolean
}

export class SessionController {


    private static pidToSessionMap: Map<number, AudioSession> = new Map();


    public static getMasterVolume(): number {
        return NodeAudioVolumeMixer.getMasterVolumeLevelScalar();
    }

    public static setMasterVolume(volume: number): void {
        if (volume > 1 || volume < 0) {
            throw new Error("Volume must be between 0 and 1. Input: " + volume);
        }

        NodeAudioVolumeMixer.setMasterVolumeLevelScalar(volume);
    }

    public static isMasterMuted(): boolean {
        return NodeAudioVolumeMixer.isMasterMuted();
    }

    public static setMasterMute(isMasterMuted: boolean): void {
        NodeAudioVolumeMixer.muteMaster(isMasterMuted);
    }


    public static async getSessions(): Promise<Session[]> {
        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);
        const sessions: AudioSession[] = masterDevice.sessions;

        const sessionList: Session[] = [];

        await Promise.all(sessions.map(async (session: AudioSession) => {
            const path = session.appName;
            const sessionName: string | null = await this.nameFromPath(path);
            let isSystemVol = false;
            if (!path) {
                isSystemVol = true;
            }

            if (sessionName === null) {
                console.log("Error getting name for " + session);
                return;
            }

            const pid: number = isSystemVol ? 0 : this.generatePIDFromPath(path);
            const sessionInMap: AudioSession = this.pidToSessionMap.get(pid);
            if (sessionInMap === undefined) {
                this.pidToSessionMap.set(pid, session);
            } else {
                if (sessionInMap.appName !== path) {
                    const errorMessage = `Duplicate PIDs found for ${path} and ${sessionInMap.appName}`;
                    throw new Error(errorMessage);
                }
            }

            const sessionObject: Session = {
                pid: pid,
                name: sessionName,
                volume: isSystemVol ? NodeAudioVolumeMixer.getAudioSessionVolumeLevelScalar(0) : session.volume,
                isMuted: isSystemVol ? NodeAudioVolumeMixer.isAudioSessionMuted(0) : session.mute
            }

            sessionList.push(sessionObject);
        }));

        return sessionList;

    }

    private static generatePIDFromPath(path: string): number {
        const hash: crypto.Hash = crypto.createHash('sha256');
        hash.update(path);
        const hashHex: string = hash.digest('hex');
        const uid: number = parseInt(hashHex.substring(0, 10), 16); // Truncate PID to 10
        return uid;
    }



    public static setSessionVolume(pid: number, volume: number): void {
        if (volume > 1 || volume < 0) {
            throw new Error("Volume must be between 0 and 1. Input: " + volume);
        }

        const session: AudioSession = this.pidToSessionMap.get(pid);
        if (session === undefined) {
            throw new Error("Could not find session with PID: " + pid);
        }

        // Set session volume
        session.volume = volume;

    }

    public static getSessionVolume(pid: number): number {
        const session: AudioSession = this.pidToSessionMap.get(pid);
        if (session === undefined) {
            throw new Error("Could not find session with PID: " + pid);
        }
        return session.volume;
    }


    public static setSessionMute(pid: number, isSessionMuted: boolean): void {
        if (pid === 0) {
            NodeAudioVolumeMixer.setAudioSessionMute(0, isSessionMuted)
        }

        const session: AudioSession = this.pidToSessionMap.get(pid);
        if (session === undefined) {
            throw new Error("Could not find session with PID: " + pid);
        }
        session.mute = isSessionMuted;
    }

    public static isSessionMuted(pid: number): boolean {
        const session: AudioSession = this.pidToSessionMap.get(pid);
        if (session === undefined) {
            throw new Error("Could not find session with PID: " + pid);
        }
        return session.mute;
    }

    public static toggleSolo(pid: number): void {
        let allMuted = true;

        this.pidToSessionMap.forEach((_, sessionPID: number) => {
            if (sessionPID !== pid && !SessionController.isSessionMuted(sessionPID)) {
                allMuted = false;
            }
        });

        if (allMuted) {
            if (!SessionController.isSessionMuted(pid)) { // Solo already applied, remove it
                this.pidToSessionMap.forEach((_, sessionPID: number) => {
                    SessionController.setSessionMute(sessionPID, false);
                });
            } else { // Everything including the solo session is muted. Unmute solo
                SessionController.setSessionMute(pid, false);
            }
        } else { // Apply solo
            this.pidToSessionMap.forEach((_, sessionPID: number) => {
                SessionController.setSessionMute(sessionPID, sessionPID !== pid);
            });


        }
        console.log("Toggling mute for session: " + pid);
    }




    private static async nameFromPath(path: string): Promise<string | null> {
        let error: any;

        try {
            const command: string = `(Get-Item "${path}").VersionInfo.FileDescription`
            const { stdout, stderr } = await exec(command, { 'shell': 'powershell.exe' });
            if (stdout) {
                return stdout.trim();
            }
            error = stderr;
        } catch (e) {
            if (!path) {
                return "Session Volume";
            }
            error = e;
        }
        if (!path) {
            return "Session Volume";
        }

        console.error(error);


        return null;
    }





}