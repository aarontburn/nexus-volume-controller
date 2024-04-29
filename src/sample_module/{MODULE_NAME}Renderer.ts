/**
 * Renderer process
 */

(() => { // Wrapped in an anonymous function for scoping.

    // Change this to EXACTLY what is in the {MODULE_NAME}Module.MODULE_NAME field.
    const MODULE_NAME = "{MODULE_NAME}"
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

    window.parent.ipc.on(MODULE_RENDERER_NAME, (_, eventType: string, data: any[]) => {
        data = data[0]; // Data is wrapped in an extra array.
        switch (eventType) {
            case "sample_event": {
                console.log("Recieved from process: " + data);
                sendToProcess("sample_event_from_renderer", "sample data 1", "sample data 2");
                break;
            }
        }
    });
})();





