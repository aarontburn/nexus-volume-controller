module.exports = {
    build: {
        name: "Volume Controller",
        id: "aarontburn.Volume_Controller",
        process: "./process/main.js",
        replace: [
            {
                from: "{EXPORTED_MODULE_ID}",
                to: "%id%",
                at: ["./process/main.ts", "./renderer/renderer.ts"]
            },
            {
                from: "{EXPORTED_MODULE_NAME}",
                to: "%name%",
                at: ["./process/main.ts", "./module-info.json"]
            }
        ]
    }
}