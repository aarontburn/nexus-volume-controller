import SoundMixer, { AudioSession, Device, DeviceType } from "native-sound-mixer";
import { Window, windowManager } from "node-window-manager";


export interface Session {
    pid: number,
    name: string,
    volume: number,
    isMuted: boolean,
    backgroundMute: boolean
}

export class SessionController {

    private static bgMuteSessions: Set<string> = new Set();

    public static init(bgMute: Set<string>): void {
        this.bgMuteSessions = bgMute;
    }


    public static getMasterVolume(): number {
        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);
        return masterDevice.volume;
    }

    public static setMasterVolume(volume: number): void {
        if (volume > 1 || volume < 0) {
            throw new Error("Volume must be between 0 and 1. Input: " + volume);
        }

        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);
        masterDevice.volume = volume;
    }

    public static isMasterMuted(): boolean {
        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);
        return masterDevice.mute;
    }

    public static setMasterMute(isMasterMuted: boolean): void {
        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);
        masterDevice.mute = isMasterMuted;
    }


    public static getSessions(): Session[] {
        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);
        const sessions: AudioSession[] = masterDevice.sessions;

        const sessionList: Session[] = [];

        sessions.forEach((session: AudioSession) => {

            const sessionName: string = session.name === '' ? "System Volume" : this.parsePathToApplicationName(session.appName);
            if (sessionName === undefined) {
                return;
            }

            const pid: number = this.parsePID(session.id);
            const sessionObject: Session = {
                pid: pid,
                name: sessionName,
                volume: session.volume,
                isMuted: session.mute,
                backgroundMute: this.bgMuteSessions.has(session.appName)
            }

            sessionList.push(sessionObject);
        })

        return sessionList;
    }


    private static readonly REGEX = /\\[\w\.]+$/g

    private static parsePathToApplicationName(path: string): string | null {
        const name = path.match(this.REGEX)?.pop().substring(1).split(".")[0];
        return name;
    }

    private static parsePID(id: string): number {
        const pid: string = id.split("%")[2].replace(/\D/g, '');

        return !pid ? 0 : Number(pid);
    }



    private static getSessionByPID(pid: number): AudioSession {
        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);

        const sessions: AudioSession[] = masterDevice.sessions;
        for (let i = 0; i < sessions.length; i++) {
            if (this.parsePID(sessions[i].id) === pid) {
                return sessions[i];
            }
        }

        throw new Error("Could not find session with PID: " + pid);
    }

    public static getSessionsByPath(path: string): AudioSession[] {
        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);

        const out: AudioSession[] = []

        const sessions: AudioSession[] = masterDevice.sessions;
        for (let i = 0; i < sessions.length; i++) {
            if (sessions[i].appName === path) {
                out.push(sessions[i]);
            }
        }

        return out
    }

    public static setSessionVolume(pid: number, volume: number): void {
        if (volume > 1 || volume < 0) {
            throw new Error("Volume must be between 0 and 1. Input: " + volume);
        }

        this.getSessionByPID(pid).volume = volume;
    }

    public static getSessionVolume(pid: number): number {
        return this.getSessionByPID(pid).volume;
    }

    public static setSessionMute(pid: number, isSessionMuted: boolean): void {
        this.getSessionByPID(pid).mute = isSessionMuted;
    }

    public static isSessionMuted(pid: number): boolean {
        return this.getSessionByPID(pid).mute;
    }

    public static toggleSolo(pid: number): void {
        let allMuted = true;

        const masterDevice: Device | undefined = SoundMixer.getDefaultDevice(DeviceType.RENDER);
        const sessions: AudioSession[] = masterDevice.sessions;

        sessions.forEach(session => {
            const sessionPID: number = this.parsePID(session.id);
            if (sessionPID !== pid && !this.isSessionMuted(sessionPID)) {
                allMuted = false;
            }
        })

        if (allMuted) {
            if (!SessionController.isSessionMuted(pid)) { // Solo already applied, remove it
                sessions.forEach(sessions => {
                    SessionController.setSessionMute(this.parsePID(sessions.id), false);
                });
            } else { // Everything including the solo session is muted. Unmute solo
                SessionController.setSessionMute(pid, false);
            }
        } else { // Apply solo
            sessions.forEach(sessions => {
                const sessionPID = this.parsePID(sessions.id);
                SessionController.setSessionMute(sessionPID, sessionPID !== pid);
            });
        }
        console.log("Toggling mute for session: " + pid);
    }


    public static toggleUnfocusedSession(sessionPID: number): void {
        const path: string = this.getSessionByPID(sessionPID).appName;

        if (this.bgMuteSessions.has(path)) {
            this.bgMuteSessions.delete(path);
        } else {
            this.bgMuteSessions.add(path);
        }

        this.windowChanged(windowManager.getActiveWindow());
    }


    static {
        console.log("Attaching window listener");

        windowManager.on("window-activated", (window: Window) => {
            this.windowChanged(window);
        });

    }

    private static windowChanged(currentWindow: Window): void {

        this.bgMuteSessions.forEach(path => {
            const sessions: AudioSession[] = this.getSessionsByPath(path);

            for (const session of sessions) {
                const pid = this.parsePID(session.id);
                this.setSessionMute(pid, path !== currentWindow.path);
            }
        });

    }

    public static getBGMutePaths(): Set<string> {
        return this.bgMuteSessions;
    }




}