const fullDate: HTMLElement = document.getElementById("full-date");
const abbreviatedDate: HTMLElement = document.getElementById("abbreviated-date");

const standardTime: HTMLElement = document.getElementById("standard-time");
const militaryTime: HTMLElement = document.getElementById("military-time");


window.parent.ipc.send("home-process", "init");
window.parent.ipc.on("home-renderer", (_, eventType: string, data: any[]) => {
    data = data[0]; // Data is wrapped in an extra array.
    switch(eventType) {
        case "update-clock": {
            fullDate.innerHTML = data[0];
            abbreviatedDate.innerHTML = data[1];
            standardTime.innerHTML = data[2];
            militaryTime.innerHTML = data[3];
            break;
        }
    }
});
