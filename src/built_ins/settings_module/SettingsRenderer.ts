(() => {
    const MODULE_NAME = "Settings"
    const MODULE_PROCESS_NAME = MODULE_NAME.toLowerCase() + "-process";
    const MODULE_RENDERER_NAME = MODULE_NAME.toLowerCase() + "-renderer"
    const sendToProcess = (eventType: string, ...data: any): void => {
        window.parent.ipc.send(MODULE_PROCESS_NAME.toLowerCase(), eventType, ...data);
    }

    sendToProcess("settings-init");


    let currentlySelectedTab: HTMLElement = undefined;

    const moduleList: HTMLElement = document.getElementById("left");
    const settingsList: HTMLElement = document.getElementById("right");

    window.parent.ipc.on(MODULE_RENDERER_NAME, (_, eventType: string, data: any[]) => {
        data = data[0]; // Data is wrapped in an extra array.
        switch (eventType) {
            case "populate-settings-list": {
                populateSettings(data[0]);
                break;
            }
            case "setting-modified": {
                const elementId = data[0];
                const newValue = data[1];

                const element: any = document.getElementById(elementId);
                element.value = newValue;

                break;
            }
            case "refresh-settings": {
                const root: any = window.parent.document.querySelector(':root');

                root.style.setProperty('--accent-color', data[0]);
                // document.documentElement.style.setProperty("--accent-color", data[0]);
                // TODO: Update accent color of all other IFrames

                break;
            }

            case "swap-tab": {
                console.log(data[0])
                swapTabs(data[0]);

                break;
            }
        }
    });

    function populateSettings(data: any[]): void {
        data.forEach((obj: any) => {
            const moduleName: string = obj.module;

            // Setting group click button
            const groupElement: HTMLElement = document.createElement("p");
            groupElement.innerText = moduleName;
            groupElement.addEventListener("click", () => {
                if (currentlySelectedTab != undefined) {
                    currentlySelectedTab.style.color = "";
                }
                currentlySelectedTab = groupElement;
                currentlySelectedTab.setAttribute("style", "color: var(--accent-color);")

                sendToProcess('swap-settings-tab', moduleName);


            });

            moduleList.insertAdjacentElement("beforeend", groupElement);


        });
    }

    function swapTabs(tab: any): void {

        // Clear existing settings
        while (settingsList.firstChild) {
            settingsList.removeChild(settingsList.firstChild);
        }


        tab.settings.forEach((settingInfo: any) => {
            const inputType: string = settingInfo.inputType;
            const interactiveIds: string[] = settingInfo.interactiveIds;
            const ui: string = settingInfo.ui;
            const style: string = settingInfo.style;
            const attribute: string = settingInfo.attribute;


            settingsList.insertAdjacentHTML("beforeend", ui);
            // Add custom setting css to setting
            if (style != "") {
                const styleId = interactiveIds[0] + "_style";
                if (document.getElementById(styleId) == null) {
                    const styleSheet: HTMLElement = document.createElement('style')
                    styleSheet.id = styleId;
                    styleSheet.innerHTML = style
                    document.body.appendChild(styleSheet);
                }
            }
            interactiveIds.forEach((id: string) => {
                const element: HTMLElement = document.getElementById(id);

                switch (inputType) {
                    case "checkbox": {
                        element.addEventListener('change', () => {
                            sendToProcess("setting-modified", id, (element as any)[attribute]);
                        });
                        break;
                    }
                    case 'text': {
                        element.addEventListener('keyup', (event: KeyboardEvent) => {
                            if (event.key === "Enter") {
                                sendToProcess("setting-modified", id, (element as any)[attribute]);
                            }
                        });

                        element.addEventListener('blur', () => {
                            sendToProcess("setting-modified", id, (element as any)[attribute]);
                        });

                        break;
                    }
                    // TODO: Add additional options
                }


            });

        });
    }



    dragElement(document.getElementById("separator"));

    function dragElement(element: HTMLElement) {
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

            document.onmousemove = (e: MouseEvent) => {
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



