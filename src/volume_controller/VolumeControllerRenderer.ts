/**
 * Renderer process
 */

interface Session {
    pid: number,
    name: string,
    volume: number,
    isMuted: boolean
}

(() => { // Wrapped in an anonymous function for scoping.

    // Change this to EXACTLY what is in the {MODULE_NAME}Module.MODULE_NAME field.
    const MODULE_NAME = "Volume Controller"
    const MODULE_PROCESS_NAME = MODULE_NAME.toLowerCase() + "-process";
    const MODULE_RENDERER_NAME = MODULE_NAME.toLowerCase() + "-renderer"

    // If this is not shown in the developer console, the renderer wasn't properly initialized.
    // Check the {MODULE_NAME}HTML.html script name.
    console.log(MODULE_RENDERER_NAME + " initialzed.");

    const sendToProcess = (eventType: string, ...data: any): void => {
        window.parent.ipc.send(MODULE_PROCESS_NAME.toLowerCase(), eventType, ...data);
    }


    // Instruct module process to initialize once the renderer is ready.
    sendToProcess("init");

    const sessionHTMLMap: Map<number, HTMLElement> = new Map();
    const sessionObjMap: Map<number, Session> = new Map();
    let isPIDVisible: boolean = false;



    window.parent.ipc.on(MODULE_RENDERER_NAME, async (_, eventType: string, data: any[]) => {
        data = data[0]; // Data is wrapped in an extra array.
        switch (eventType) {
            case 'master-update': {
                updateMaster(data[0]);
                break;
            }
            case "vol-sessions": {
                refreshSessions(data[0]);
                break;
            }
            case "session-pid-visibility-modified": {
                isPIDVisible = data[0];
                sessionHTMLMap.forEach((html, pid) => {
                    const session: Session = sessionObjMap.get(pid);
                    html.querySelector(".session-name").textContent = formatSessionName(session.name, session.pid);
                });
                break;
            }
        }
    });


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
        if (masterMuteButton.classList.contains('session-mute-active')) {
            // unmute
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

            masterMuteButton.classList.add('session-mute-active');
            return;
        }
        masterSessionBox.classList.remove('muted-session-box');
        masterSessionText.classList.remove('session-muted');
        masterSlider.classList.remove('session-muted');
        masterVolumeText.classList.remove('session-muted');

        masterMuteButton.classList.remove('session-mute-active');

    }

    function updateMaster(masterInfo: { isMuted: boolean, volume: number }): void {
        const isMuted: boolean = masterInfo.isMuted;
        const masterVolume: number = masterInfo.volume;

        const volume: number = Math.round(masterVolume * 100)
        masterSlider.value = String(volume);

        masterVolumeText.textContent = String(volume) + "%";
        setMasterMute(isMuted);
    }



    function refreshSessions(data: any[]): void {
        const sessionArray: Session[] = data;
        const pidArray: number[] = []
        for (const session of sessionArray) {
            pidArray.push(session.pid);

            const roundedVolume: number = Math.round(session.volume * 100);
            const formattedName: string = formatSessionName(session.name, session.pid);


            let sessionBoxHTML: HTMLElement = sessionHTMLMap.get(session.pid);
            if (sessionBoxHTML === undefined) { // Session not in map
                sessionObjMap.set(session.pid, session);

                sessionBoxHTML = document.createElement('div');
                sessionBoxHTML.id = `session-${session.pid}`;
                sessionBoxHTML.className = 'session-box';
                sessionBoxHTML.innerHTML = `
                    <p class='session-name gray-scalable'>${formattedName}</p>

                    <div style='margin-right: auto'></div>

                    <div style='display: flex; width: 50%'>
                        <div class='session-controls'>
                            <input class='vol-slider gray-scalable' type="range" min="0" max="100" value='${roundedVolume}'>

                            <div class='session-mute-solo-group'>
                                <p class='session-mute'>M</p>
                                <p class='session-solo'>S</p>
                            </div>
                        </div>

                        <p class='session-volume gray-scalable'>${roundedVolume}%</p>
                    </div>
                `;

                const slider: HTMLInputElement = sessionBoxHTML.querySelector('.vol-slider') as HTMLInputElement;
                slider.addEventListener("input", (event: Event) => {
                    const sliderValue: number = Number((event.target as HTMLInputElement).value);
                    sessionBoxHTML.querySelector(".session-volume").textContent = `${sliderValue.toString()}%`;
                    sendToProcess("volume-modified", session.pid, sliderValue);
                });

                const muteButton: HTMLElement = sessionBoxHTML.querySelector('.session-mute');
                setMuteButton(session.pid, muteButton, session.isMuted);
                muteButton.addEventListener("click", () => {
                    sendToProcess('session-muted', session.pid);
                    setMuteButton(session.pid, muteButton, !muteButton.classList.contains("session-mute-active"));
                });

                const soloButton: HTMLElement = sessionBoxHTML.querySelector('.session-solo');
                soloButton.addEventListener("click", () => {
                    sendToProcess('session-solo', session.pid);
                    toggleSolo(session.pid);


                });

                document.getElementById("session-box-container").appendChild(sessionBoxHTML);
                sessionHTMLMap.set(session.pid, sessionBoxHTML);
            } else { // Updating existing element with new values
                setMuteButton(session.pid, sessionBoxHTML.querySelector(".session-mute"), session.isMuted);
                sessionBoxHTML.querySelector(".session-name").textContent = formattedName;
                sessionBoxHTML.querySelector(".session-volume").textContent = `${roundedVolume}%`;
            }
        }
        sessionHTMLMap.forEach((htmlElement, pid) => { // Removes applications that aren't used
            if (!pidArray.includes(pid)) {
                htmlElement.remove();
                sessionHTMLMap.delete(pid);
                sessionObjMap.delete(pid);
            }
        });
    }

    /*
        If session is muted, unmute it and mute all others

        If session is unmuted
            Check if all the other sessions are muted
                If all other sessions are muted,
                    Unmute all sessions
                If not all other sessions are muted,
                    mute all sessions
    */

    function toggleSolo(soloedSessionPID: number): void {
        if (sessionObjMap.get(soloedSessionPID).isMuted === true) { // soloed track is muted. unmute it an mute others
            sessionHTMLMap.forEach((html, pid) => {
                if (pid === soloedSessionPID) {
                    setMuteButton(pid, html.querySelector(".session-mute"), false);
                } else {
                    setMuteButton(pid, html.querySelector(".session-mute"), true);

                }
            });
            return;
        }



        let allMuted = true;
        sessionObjMap.forEach((session, pid) => {
            if (pid === soloedSessionPID) {
                return;
            }

            if (session.isMuted === false) {
                allMuted = false;
            }
        });

        if (allMuted) {
            console.log("removing solo");

            sessionHTMLMap.forEach((html, pid) => {
                setMuteButton(pid, html.querySelector(".session-mute"), false);
            });
        } else {
            console.log("applying solo");
            sessionHTMLMap.forEach((html, pid) => {
                if (pid === soloedSessionPID) {
                    setMuteButton(pid, html.querySelector(".session-mute"), false);
                } else {
                    setMuteButton(pid, html.querySelector(".session-mute"), true);

                }
            });
        }



        // if (allMuted) { // All tracks are already muted
        //     if (!sessionObjMap.get(soloedSessionPID).isMuted) { // Solo already applied, remove it
        //         console.log("Removing solo");

        //     } else { // Solo not applied since session is muted, unmute session
        //         setMuteButton(soloedSessionPID, sessionHTMLMap.get(soloedSessionPID).querySelector(".session-mute"), false);
        //     }
        // } else { // Apply solo
        //     console.log("applying solo");

        // }
    }


    function setMuteButton(sessionPID: number, muteButton: HTMLElement, isMuted: boolean): void {
        const sessionMuteActive: string = 'session-mute-active';
        const sessionMuted: string = 'session-muted';

        const sessionBox: Element = document.getElementById(`session-${sessionPID}`);
        const grayScalableElements: NodeListOf<Element> = document.querySelectorAll(`#session-${sessionPID} .gray-scalable`);

        if (isMuted) {
            muteButton.classList.add(sessionMuteActive);
            sessionBox?.classList.add('muted-session-box');

            // Make specific elements grayed
            for (let i = 0; i < grayScalableElements.length; i++) {
                const element = grayScalableElements.item(i);
                element.classList.add(sessionMuted);
            }

            return;
        }

        muteButton.classList.remove(sessionMuteActive);
        sessionBox?.classList.remove('muted-session-box');


        for (let i = 0; i < grayScalableElements.length; i++) {
            const element = grayScalableElements.item(i);
            element.classList.remove(sessionMuted);
        }


    }


    function formatSessionName(name: string, pid: number): string {
        return name.charAt(0).toUpperCase()
            + name.substring(1).toLowerCase().replace(".exe", "")
            + (isPIDVisible ? ` (${pid})` : "");
    }


    dragElement(document.getElementById("separator"));

    function dragElement(element: HTMLElement): void {
        let md: any;
        const left: HTMLElement = document.getElementById("left");
        const right: HTMLElement = document.getElementById("right");

        element.onmousedown = (e: MouseEvent) => {
            md = {
                e,
                offsetLeft: element.offsetLeft,
                offsetTop: element.offsetTop,
                firstWidth: left.offsetWidth,
                secondWidth: right.offsetWidth
            };

            document.onmousemove = (e: MouseEvent): void => {
                let delta: { x: number, y: number } = {
                    x: e.clientX - md.e.clientX,
                    y: e.clientY - md.e.clientY
                };

                delta.x = Math.min(Math.max(delta.x, -md.firstWidth), md.secondWidth);

                element.style.left = md.offsetLeft + delta.x + "px";
                left.style.width = (md.firstWidth + delta.x) + "px";
                right.style.width = (md.secondWidth - delta.x) + "px";
            };
            document.onmouseup = () => {
                document.onmousemove = document.onmouseup = null;
            }
        };
    }






})();





