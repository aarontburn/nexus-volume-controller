window.ipc.send("settings-process", "settings-init");

const PROCESS: string = "settings-process";
const RENDERER: string = "settings-renderer";


let currentlySelectedTab: HTMLElement = undefined;

const moduleList: HTMLElement = document.getElementById("left");
const settingsList: HTMLElement = document.getElementById("right");

window.parent.ipc.on(RENDERER, (_, eventType: string, data: any[]) => {
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
            const root:any = window.parent.document.querySelector(':root');

            root.style.setProperty('--accent-color', data[0]);
            // document.documentElement.style.setProperty("--accent-color", data[0]);
            // TODO: Update accent color of all other IFrames

            break;
        }
    }
});

function populateSettings(data: any[]): void {
    data.forEach((obj: any) => {
        const moduleName: string = obj.module;
        const groupElement: HTMLElement = document.createElement("p");
        groupElement.innerText = moduleName;
        groupElement.addEventListener("click", () => {
            if (currentlySelectedTab != undefined) {
                currentlySelectedTab.style.color = "";
            }
            currentlySelectedTab = groupElement;
            currentlySelectedTab.setAttribute("style", "color: var(--accent-color);")

            // Swap tabs
            removeDivChildren(settingsList);
            obj.settings.forEach((settingInfo: any) => {
                const interactiveIds: string[] = settingInfo.interactiveIds;
                const ui: string = settingInfo.ui;
                const style: string = settingInfo.style;
                const eventType: string = settingInfo.eventType;
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
                    const element: any = document.getElementById(id);
                    element.addEventListener(eventType, () => {
                        window.ipc.send(PROCESS, "setting-modified", id, element[attribute]);
                    })
                });

            });
        });

        moduleList.insertAdjacentElement("beforeend", groupElement);


    });
}

function removeDivChildren(parent: HTMLElement) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
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



