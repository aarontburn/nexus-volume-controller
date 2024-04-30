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
        window.parent.ipc.send(MODULE_PROCESS_NAME.toLowerCase(), eventType, data);
    }


    // Instruct module process to initialize once the renderer is ready.
    sendToProcess("init");

    const sessionHTMLMap: Map<number, HTMLElement> = new Map();
    const sessionObjMap: Map<number, Session> = new Map();
    let isPIDVisible: boolean = false;


    window.parent.ipc.on(MODULE_RENDERER_NAME, async (_, eventType: string, data: any[]) => {
        data = data[0]; // Data is wrapped in an extra array.
        return 
        switch (eventType) {
            case "vol-sessions": {
                refreshSessions(data);
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
                sessionBoxHTML.className = 'session-box'
                sessionBoxHTML.innerHTML = `
                    <p class='session-name'>${formattedName}</p>
                    <div class='spacer'></div>
                    <p class='session-volume'>${roundedVolume}%</p>
                    <input class='vol-slider' type="range" min="0" max="100" value='${roundedVolume}'>
                    <div class='session-controls'>
                        <p class='session-mute'>M</p>
                        <p class='session-solo'>S</p>
                    </div>
                `;
                const slider: HTMLInputElement = sessionBoxHTML.querySelector('.vol-slider') as HTMLInputElement;
                slider.addEventListener("input", (event: Event) => {
                    const sliderValue: number = Number((event.target as HTMLInputElement).value);
                    sessionBoxHTML.querySelector(".session-volume").textContent = `${sliderValue.toString()}%`;
                    window.ipc.send(MODULE_PROCESS_NAME, "volume-modified", session.pid, sliderValue);
                });
    
                const muteButton: HTMLElement = sessionBoxHTML.querySelector('.session-mute');
                setMuteButton(muteButton, session.isMuted)
                muteButton.addEventListener("click", () => {
                    // sessionBoxHTML.querySelector(".session-volume").textContent = `${roundedVolume}%`;
                    sendToProcess('session-muted', session.pid)
                    muteButton.classList.toggle("session-mute-active")
                });
    
                const soloButton: HTMLElement = sessionBoxHTML.querySelector('.session-solo');
                soloButton.addEventListener("click", () => {
                    sendToProcess('session-solo', session.pid);
                    sessionHTMLMap.forEach((html, pid) => {
                        if (pid !== session.pid) {
                            setMuteButton(html.querySelector(".session-mute"), true)
                        }
                    });
    
                });
    
                document.getElementById("session-box-container").appendChild(sessionBoxHTML);
                sessionHTMLMap.set(session.pid, sessionBoxHTML);
            } else { // Updating existing element with new values
                setMuteButton(sessionBoxHTML.querySelector(".session-mute"), session.isMuted);
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
    
    function setMuteButton(muteButton: HTMLElement, isMuted: boolean): void {
        if (isMuted) {
            muteButton.classList.add("session-mute-active");
            return;
        }
        muteButton.classList.remove("session-mute-active");
    }
    
    
    function formatSessionName(name: string, pid: number): string {
        return name.charAt(0).toUpperCase()
            + name.substring(1).toLowerCase().replace(".exe", "")
            + (isPIDVisible ? ` (${pid})` : "");
    }






})();





