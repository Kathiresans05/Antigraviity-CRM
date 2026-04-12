const { io } = require("socket.io-client");

const socket = io("https://antigraviity-crm-cxmf.onrender.com/monitoring", {
    path: "/socket.io",
    timeout: 10000
});

socket.on("connect", () => {
    console.log("Connected to Render signaling server!");
    process.exit(0);
});

socket.on("connect_error", (err) => {
    console.error("Connection error:", err.message);
    process.exit(1);
});

setTimeout(() => {
    console.log("Connection timed out.");
    process.exit(1);
}, 15000);
