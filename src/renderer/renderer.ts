/**
 * Renderer process
 */

interface Session {
    pid: number,
    name: string,
    volume: number,
    isMuted: boolean,
    backgroundMute: boolean,
    isLocked: boolean
}

const MODULE_ID: string = "{EXPORTED_MODULE_ID}";

const sendToProcess = (eventType: string, ...data: any[]): Promise<void> => {
    return window.parent.ipc.send(MODULE_ID, eventType, data);
}


window.parent.ipc.on(MODULE_ID, (_, eventType: string, data: any[]) => {
    handleEvent(eventType, data);
});


sendToProcess("init");

const CONTROL_ACTIVE_CSS: string = 'session-option-active';

const handleEvent = (eventType: string, data: any[]) => {
    switch (eventType) {
        case 'master-update': {
            updateMaster(data[0]);
            break;
        }
        case "vol-sessions": {
            SessionBox.updateSessions(data[0]);

            break;
        }
        case "session-pid-visibility-modified": {
            SessionBox.setPIDVisibility(data[0]);
            break;
        }
        case 'soloed-track': {
            SessionBox.sessionSoloed(data[0])
            break;
        }
    }
};


const masterSlider: HTMLInputElement = document.getElementById('master-vol-slider') as HTMLInputElement;
const masterSessionBox: HTMLElement = document.getElementById('master-session');
const masterSessionText: HTMLElement = document.getElementById('master-title');
const masterVolumeText: HTMLElement = document.getElementById('master-volume-label');
const masterMuteButton: HTMLElement = document.getElementById('master-mute-button');

masterSlider.addEventListener("input", (event: Event) => {
    const sliderValue: number = Number((event.target as HTMLInputElement).value);
    masterVolumeText.textContent = `${sliderValue.toString()}%`;
    sendToProcess("master-volume-modified", sliderValue);
});

masterMuteButton.addEventListener('click', () => {
    if (masterMuteButton.classList.contains(CONTROL_ACTIVE_CSS)) {
        setMasterMute(false);
        sendToProcess('session-mute-state', false);
        return;
    }
    sendToProcess('session-mute-state', true);
    setMasterMute(true);

});

function setMasterMute(isMasterMuted: boolean) {
    if (isMasterMuted) {
        masterSessionBox.classList.add('muted-session-box');
        masterSessionText.classList.add('session-muted');
        masterSlider.classList.add('session-muted');
        masterVolumeText.classList.add('session-muted');
        masterMuteButton.classList.add(CONTROL_ACTIVE_CSS);
        return;
    }
    masterSessionBox.classList.remove('muted-session-box');
    masterSessionText.classList.remove('session-muted');
    masterSlider.classList.remove('session-muted');
    masterVolumeText.classList.remove('session-muted');
    masterMuteButton.classList.remove(CONTROL_ACTIVE_CSS);

}

function updateMaster(masterInfo: { isMuted: boolean, volume: number }): void {
    const isMuted: boolean = masterInfo.isMuted;
    const masterVolume: number = masterInfo.volume;

    const volume: number = Math.round(masterVolume * 100)
    masterSlider.value = String(volume);

    masterVolumeText.textContent = String(volume) + "%";
    setMasterMute(isMuted);
}




dragElement(document.getElementById("separator"));
function dragElement(element: HTMLElement) {
    let md: any;
    const left: HTMLElement = document.getElementById("left");
    const right: HTMLElement = document.getElementById("right");
    const container: HTMLElement = document.getElementById("splitter");

    element.onmousedown = (e: MouseEvent) => {
        md = {
            e,
            leftWidth: left.offsetWidth,
            rightWidth: right.offsetWidth,
            containerWidth: container.offsetWidth
        };

        document.onmousemove = (e) => {
            const deltaX: number = e.clientX - md.e.clientX

            let newLeftWidth = md.leftWidth + deltaX;
            let newRightWidth = md.rightWidth - deltaX;

            if (newLeftWidth < 0) {
                newLeftWidth = 0;
            }

            if (newRightWidth < 0) {
                newRightWidth = 0;
            }

            const leftPercent = (newLeftWidth / md.containerWidth) * 100;
            const rightPercent = (newRightWidth / md.containerWidth) * 100;

            left.style.width = leftPercent + "%";
            right.style.width = rightPercent + "%";
        };

        document.onmouseup = () => {
            document.onmousemove = document.onmouseup = null;
        };
    };
}


class SessionBox {

    private static readonly sessionBoxMap: Map<number, SessionBox> = new Map();
    private static isPIDVisible: boolean = false;

    public static sessionSoloed(session: Session) {
        this.sessionBoxMap.forEach((sessionBox, pid) => {
            sessionBox.setSoloed(session !== null && session.pid === pid)
        });
    }

    public static setPIDVisibility(isPIDVisible: boolean): void {
        this.isPIDVisible = isPIDVisible;
        this.sessionBoxMap.forEach((sessionBox, _) => sessionBox.updateName());
    }

    public static updateSessions(sessions: Session[]): void {
        const sessionBoxContainer: HTMLElement = document.getElementById("session-box-container");
        const pidArray: number[] = [];

        for (const session of sessions) {
            pidArray.push(session.pid);

            let sessionBox: SessionBox = this.sessionBoxMap.get(session.pid);
            if (sessionBox === undefined) {
                sessionBox = new SessionBox(session);
                this.sessionBoxMap.set(session.pid, sessionBox);
                sessionBoxContainer.appendChild(sessionBox.getHTML());
            } else {
                sessionBox.update(session);
            }
        }

        this.sessionBoxMap.forEach((sessionBox, pid) => { // Removes applications that aren't used
            if (!pidArray.includes(pid)) {
                sessionBox.getHTML().remove();
                this.sessionBoxMap.delete(pid);
            }
        });
    }


    private session: Session;

    private nameLabel: HTMLElement;
    private volumeLabel: HTMLElement;

    private muteButton: HTMLElement;
    private soloButton: HTMLElement;
    private bgMuteButton: HTMLElement;
    private lockButton: HTMLElement;
    private volSlider: HTMLInputElement;

    private parentDiv: HTMLDivElement;

    constructor(session: Session) {
        this.session = session;

        const roundedVolume: number = Math.round(session.volume * 100);
        const formattedName: string = this.getFormattedName();

        this.parentDiv = document.createElement('div');
        this.parentDiv.id = `session-${session.pid}`;
        this.parentDiv.className = 'session-box';
        this.parentDiv.innerHTML = `
                <p class='session-name gray-scalable'>${formattedName}</p>

                <div style='margin-right: auto'></div>

                <div style='display: flex; width: 50%'>
                    <div class='session-controls'>
                        <input class='vol-slider gray-scalable' type="range" min="0" max="100" value='${roundedVolume}'>

                        <div class='session-mute-solo-group'>
                            <p class='session-mute'>M</p>
                            <p class='session-solo'>S</p>
                            <p class='background-mute'>BM</p>
                            <p class='session-lock'>L</p>
                        </div>
                    </div>

                    <p class='session-volume gray-scalable'>${roundedVolume}%</p>
                </div>
            `;


        this.nameLabel = this.parentDiv.querySelector(".session-name");
        this.volumeLabel = this.parentDiv.querySelector(".session-volume");

        this.volSlider = this.parentDiv.querySelector('.vol-slider') as HTMLInputElement;
        this.lockButton = this.parentDiv.querySelector(".session-lock");
        this.muteButton = this.parentDiv.querySelector('.session-mute');
        this.bgMuteButton = this.parentDiv.querySelector('.background-mute');
        this.soloButton = this.parentDiv.querySelector('.session-solo');



        this.volSlider.addEventListener("input", (event: Event) => {
            const sliderValue: number = Number((event.target as HTMLInputElement).value);
            this.volumeLabel.textContent = `${sliderValue.toString()}%`;
            sendToProcess("volume-modified", session.pid, sliderValue);
        });

        this.muteButton.addEventListener("click", () => {
            this.setMute();
            sendToProcess('session-mute', session.pid);

        });


        this.soloButton.addEventListener("click", () => {
            this.toggleSolo();
            sendToProcess('session-solo', session.pid);
        });


        this.bgMuteButton.addEventListener("click", () => {
            this.setBGMute();
            sendToProcess('mute-unfocused', session.pid);
        });

        this.lockButton.addEventListener('click', () => {
            this.setLocked();
            sendToProcess('session-lock', session.pid);
        });

        this.update(session);
    }

    public setSoloed(isSoloed: boolean) {
        if (isSoloed) {
            this.soloButton.classList.add(CONTROL_ACTIVE_CSS);
        } else {
            this.soloButton.classList.remove(CONTROL_ACTIVE_CSS)
        }
    }

    public getHTML(): HTMLDivElement {
        return this.parentDiv;
    }


    public update(session: Session) {
        if (session.pid !== this.session.pid) {
            throw new Error(`Mismatched session pid. Expected: ${this.session.pid} | Received: ${session.pid}`);
        }

        this.session = session;

        const roundedVolume: number = Math.round(session.volume * 100);
        const formattedName: string = this.getFormattedName();

        this.setMute(session.isMuted);
        this.setBGMute(session.backgroundMute);
        this.setLocked(session.isLocked);
        this.nameLabel.textContent = formattedName;
        this.volumeLabel.textContent = `${roundedVolume}%`;
        this.volSlider.value = String(roundedVolume);
    }

    public updateName(): void {
        this.nameLabel.textContent = this.getFormattedName()
    }



    public toggleSolo() {
        let allMuted = true;

        SessionBox.sessionBoxMap.forEach((sessionBox, otherPID) => {
            if (!sessionBox.session.isLocked
                && this.session.pid !== otherPID
                && !sessionBox.parentDiv.classList.contains('muted-session-box')) {

                allMuted = false;
            }
        })

        if (allMuted) {
            if (!this.parentDiv.classList.contains('muted-session-box')) { // Solo already applied, remove it
                SessionBox.sessionBoxMap.forEach((sessionBox, _) => {
                    if (!sessionBox.session.isLocked) { // session is not locked, don't unmute it
                        sessionBox.setMute(false);
                    }
                })
            } else { // Everything including the solo session is muted. Unmute solo
                this.setMute(false);
            }
        } else { // Apply solo; mute everything that isn't the soloed session or locked
            SessionBox.sessionBoxMap.forEach((sessionBox, pid) => {
                if (!sessionBox.session.isLocked) {
                    sessionBox.setMute(pid !== this.session.pid);
                }
            });
        }

    }


    public setLocked(isLocked?: boolean) {
        if (isLocked === undefined) {
            this.lockButton.classList.toggle(CONTROL_ACTIVE_CSS);
            return;
        }

        if (isLocked) {
            this.lockButton.classList.add(CONTROL_ACTIVE_CSS);

        } else {
            this.lockButton.classList.remove(CONTROL_ACTIVE_CSS)
        }
    }


    public setBGMute(isBGMuted?: boolean): void {
        if (isBGMuted === undefined) {
            this.bgMuteButton.classList.toggle(CONTROL_ACTIVE_CSS);
            return;
        }

        if (isBGMuted) {
            this.bgMuteButton.classList.add(CONTROL_ACTIVE_CSS);
        } else {
            this.bgMuteButton.classList.remove(CONTROL_ACTIVE_CSS)
        }
    }


    public setMute(isMuted?: boolean): void {
        if (isMuted === undefined) {
            isMuted = !this.muteButton.classList.contains(CONTROL_ACTIVE_CSS);
        }


        const sessionMuteActive: string = CONTROL_ACTIVE_CSS;
        const sessionMuted: string = 'session-muted';

        const grayScalableElements: NodeListOf<Element> = document.querySelectorAll(`#session-${this.session.pid} .gray-scalable`);

        if (isMuted) {
            this.muteButton.classList.add(sessionMuteActive);
            this.parentDiv.classList.add('muted-session-box');

            // Make specific elements grayed
            for (let i = 0; i < grayScalableElements.length; i++) {
                const element = grayScalableElements.item(i);
                element.classList.add(sessionMuted);
            }

            return;
        }

        this.muteButton.classList.remove(sessionMuteActive);
        this.parentDiv.classList.remove('muted-session-box');


        for (let i = 0; i < grayScalableElements.length; i++) {
            const element = grayScalableElements.item(i);
            element.classList.remove(sessionMuted);
        }

    }




    private getFormattedName(): string {
        return this.session.name.charAt(0).toUpperCase()
            + this.session.name.substring(1).toLowerCase().replace(".exe", "")
            + (SessionBox.isPIDVisible ? ` (${this.session.pid})` : "");
    }
}

