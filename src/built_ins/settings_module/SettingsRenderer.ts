interface ModuleInfo {
    moduleName: string,
    author: string,
    version: string,
    description: string,
    buildVersion: number,
    platforms: string[]
}

interface InputElement {
    id: string,
    inputType: string,
    attribute: string
}

interface ChangeEvent {
    id: string,
    attribute: string,
    value: any
}



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

    window.parent.ipc.on(MODULE_RENDERER_NAME, (_, eventType: string, ...data: any[]) => {
        switch (eventType) {
            case "populate-settings-list": {
                populateSettings(data[0]);
                break;
            }
            case "setting-modified": {
                const event: ChangeEvent[] = data[0]

                for (const group of event) {
                    const element: any = document.getElementById(group.id);
                    element[group.attribute] = group.value

                }


                break;
            }
            case "refresh-settings": {
                const newAccentColor: string = data[0];
                const root: any = window.parent.document.querySelector(':root');

                root.style.setProperty('--accent-color', newAccentColor);
                const contentChildren: HTMLCollection = window.parent.document.body.querySelector(".content").children;

                for (let i = 0; i < contentChildren.length; i++) {
                    const child: any = contentChildren.item(i);
                    if (contentChildren.item(i).tagName.toLowerCase() === "iframe") {
                        child.contentWindow
                            .document.querySelector(":root")
                            .style.setProperty('--accent-color', newAccentColor)
                    }
                }

                break;
            }

            case "swap-tab": {
                swapTabs(data[0]);
                break;
            }
        }
    });

    function populateSettings(data: { module: string, moduleInfo: any, settings: any[] }[]): void {
        data.forEach((obj: { module: string, moduleInfo: any, settings: any[] }) => {
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
        function getModuleInfoHTML(moduleInfo: any): string {
            const toSentenceCase = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

            const inner: string[] = [];

            inner.push(`<p style="font-size: 27px; color: var(--accent-color);">${moduleInfo.moduleName || tab.module}</p>`);

            const blacklist: string[] = [
                'moduleName', 'module_name',
                'buildVersion', 'build_version',
            ];

            for (const key in moduleInfo) {
                if (blacklist.includes(key)) {
                    continue;
                }

                const value: any = moduleInfo[key];
                if (!value || value.length === 0) {
                    continue;
                }

                inner.push(`<p><span>${toSentenceCase(key)}:</span> ${value}</p>`);

            }

            return inner.reduce((acc, html) => acc += html + "\n", '');
        }


        // Clear existing settings
        while (settingsList.firstChild) {
            settingsList.removeChild(settingsList.firstChild);
        }

        const moduleInfo: ModuleInfo = tab.moduleInfo;

        if (moduleInfo !== undefined) {
            const moduleInfoHTML: string = `
                <div class='module-info'>
                    ${getModuleInfoHTML(moduleInfo)}
                </div>
            `
            settingsList.insertAdjacentHTML("beforeend", moduleInfoHTML);
        }

        tab.settings.forEach((settingInfo: any) => {
            const settingId: string = settingInfo.settingId;
            const inputTypeAndId: InputElement[] = settingInfo.inputTypeAndId;
            const html: string = settingInfo.ui;
            const style: string = settingInfo.style;


            settingsList.insertAdjacentHTML("beforeend", html);

            // Attach events to undo button
            const undoButton: HTMLElement = document.getElementById(`undo-button_${settingId}`);
            undoButton?.addEventListener("click", () => {
                sendToProcess("setting-undo", settingId);
            });

            // Add custom setting css to setting
            if (style != "") {
                const styleId = inputTypeAndId[0] + "_style";
                if (document.getElementById(styleId) == null) {
                    const styleSheet: HTMLElement = document.createElement('style')
                    styleSheet.id = styleId;
                    styleSheet.innerHTML = style
                    document.body.appendChild(styleSheet);
                }
            }

            inputTypeAndId.forEach((group: InputElement) => {
                const id: string = group.id;
                const inputType: string = group.inputType;
                const attribute: string = group.attribute;

                const element: HTMLElement = document.getElementById(id);

                switch (inputType) {
                    case "checkbox": {
                        element.addEventListener('change', () => {
                            sendToProcess("setting-modified", id, (element as any)[attribute]);
                        });
                        break;
                    }
                    case 'number':
                    case 'text': {
                        element.addEventListener('keyup', (event: KeyboardEvent) => {
                            if (event.key === "Enter") {
                                sendToProcess("setting-modified", id, (element as any)[attribute]);
                                element.blur();
                            }
                        });

                        element.addEventListener('blur', () => {
                            sendToProcess("setting-modified", id, (element as any)[attribute]);
                        });

                        break;
                    }
                    case 'input': {
                        element.addEventListener('input', () => {
                            sendToProcess('setting-modified', id, (element as any)[attribute])
                        })
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



