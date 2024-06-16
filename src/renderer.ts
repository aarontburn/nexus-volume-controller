(() => {
    const PROCESS: string = "main-process";
    const RENDERER: string = "main-renderer";

    window.ipc.send(PROCESS, "renderer-init"); // let main know that renderer is booted

    const IFRAME_DEFAULT_STYLE: string = "height: 100%; width: 100%;";

    // const SANDBOX_RESTRICTIONS: string = Array.from(new Map([
    //     ["allow-forms", true], // Module can submit forms.
    //     ['allow-modals', true],  // Module can spawn alerts, prompts, and confirms
    //     ['allow-orientation-lock', false],
    //     ['allow-pointer-lock', false], // Module can 
    //     ['allow-popups', true],
    //     ['allow-popups-to-escape-sandbox', true],
    //     ['allow-presentation', false],
    //     ['allow-same-origin', true],
    //     ['allow-scripts', true],
    //     ['allow-top-navigation', false],
    //     ['allow-top-navigation-by-user-activation', false],
    // ])).filter(([_, v]) => v).reduce((prev, [k, _]) => prev += `${k} `, "");


    let selectedTab: HTMLElement = undefined;


    window.ipc.on(RENDERER, (_, eventType: string, data: any) => {
        // data = data[0];
        switch (eventType) {
            case "load-modules": {
                const moduleHtml: HTMLElement = document.getElementById("modules");
                const headerHtml: HTMLElement = document.getElementById("header");

                (data as Map<string, string>).forEach((moduleHtmlPath, moduleName) => {
                    const moduleView: HTMLElement = document.createElement("iframe");
                    moduleView.id = moduleName;
                    moduleView.setAttribute("src", moduleHtmlPath);
                    moduleView.setAttribute("style", IFRAME_DEFAULT_STYLE);
                    // moduleView.setAttribute("sandbox", SANDBOX_RESTRICTIONS)
                    moduleHtml.insertAdjacentElement("beforeend", moduleView);


                    const headerButton: HTMLElement = document.createElement("button");
                    headerButton.id = moduleName + "HeaderButton";
                    headerButton.textContent = moduleName;

                    if (moduleName === "Home") {
                        headerButton.setAttribute("style", "color: var(--accent-color);");
                        selectedTab = headerButton;
                    }

                    headerButton.addEventListener("click", () => {
                        if (selectedTab !== undefined) {
                            selectedTab.style.color = "";
                        }
                        selectedTab = headerButton;
                        selectedTab.setAttribute("style", "color: var(--accent-color);");

                        window.ipc.send(PROCESS, "swap-modules", moduleName);
                    });
                    headerHtml.insertAdjacentElement("beforeend", headerButton);
                });
                break;
            }
            case "swap-modules": {
                swapLayout(data)
                break;
            }
        }
    })

    function swapLayout(swapToLayoutId: string): void {
        const modules: HTMLCollection = document.getElementById("modules").getElementsByTagName("*");
        for (let i = 0; i < modules.length; i++) {
            modules[i].setAttribute("style", IFRAME_DEFAULT_STYLE + "display: none;");
        }

        document.getElementById(swapToLayoutId).setAttribute("style", IFRAME_DEFAULT_STYLE);
    }


})()







