// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process unless
// nodeIntegration is set to true in webPreferences.
// Use preload.js to selectively enable features
// needed in the renderer process.

const IFRAME_DEFAULT_STYLE: string = "height: 100%; width: 100%;";
let selectedTab: HTMLElement = undefined;

window.ipc.send(window.constants.MAIN, "renderer-init"); // let main know that renderer is booted

window.ipc.on("main-renderer", (_, eventType: string, data: any) => {
    data = data[0];
    switch (eventType) {
        case "load-modules": {
            const moduleHtml: HTMLElement = document.getElementById("modules");
            const headerHtml: HTMLElement = document.getElementById("header");

            (data as Map<string, string>).forEach((moduleHtmlPath, moduleName) => {
                const moduleView: HTMLElement = document.createElement("iframe");
                moduleView.id = moduleName;
                moduleView.setAttribute("src", moduleHtmlPath);
                moduleView.setAttribute("style", IFRAME_DEFAULT_STYLE);
                moduleHtml.insertAdjacentElement("beforeend", moduleView);

                const id: string = moduleName + "HeaderButton";
                const headerButton: HTMLElement = document.createElement("button");
                headerButton.id = id;
                headerButton.textContent = moduleName;

                if (moduleName == "Home") {
                    headerButton.setAttribute("style", "color: var(--accent-color);")
                    selectedTab = headerButton;
                }

                headerButton.addEventListener("click", () => {
                    if (selectedTab != undefined) {
                        selectedTab.style.color = "";
                    }
                    selectedTab = headerButton;
                    selectedTab.setAttribute("style", "color: var(--accent-color);")

                    window.ipc.send(window.constants.MAIN, "alert-main-swap-modules", moduleName);
                });
                headerHtml.insertAdjacentElement("beforeend", headerButton);
            });
            break;
        }
        case "swap-modules-renderer": {
            swapLayout(data)
            break;
        }
    }
})

function swapLayout(swapToLayoutId: string): void {
    const modules: HTMLCollection = document.getElementById("modules").getElementsByTagName("*")
    for (let i = 0; i < modules.length; i++) {
        modules[i].setAttribute("style", IFRAME_DEFAULT_STYLE + "display: none;");
    }

    document.getElementById(swapToLayoutId).setAttribute("style", IFRAME_DEFAULT_STYLE);
}






