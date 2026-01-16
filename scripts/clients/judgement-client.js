import { exampleTJA } from "../core/example-data.js";
export class JudgementClient {
    eventSource = null;
    simulateInterval = null;
    onMessageCallback = null;
    onStatusChangeCallback = null;
    connect(host, port) {
        this.disconnect();
        const url = `http://${host}:${port}/`;
        console.log(`Connecting to ${url}...`);
        try {
            this.eventSource = new EventSource(url);
            this.eventSource.onopen = () => {
                console.log("Connected to judgement source.");
                if (this.onStatusChangeCallback)
                    this.onStatusChangeCallback("Connected");
            };
            this.eventSource.onmessage = (event) => {
                // The C# implementation sends "judgement" and "gameplay_start" events.
                // The data payload is JSON with a "type" field.
                try {
                    // Check if it's the init message ": connected" which might come as a comment or plain text?
                    // The C# code sends: ": connected\n\n".
                    // In SSE, lines starting with ":" are comments and usually ignored by EventSource.
                    // So we probably won't see it in onmessage.
                    const data = JSON.parse(event.data);
                    if (this.onMessageCallback) {
                        this.onMessageCallback(data);
                    }
                }
                catch (e) {
                    // Only log if it looks like valid data failed parsing, ignore keep-alives if any
                    if (event.data && event.data.trim() !== "") {
                        console.error("Failed to parse event data", e, event.data);
                    }
                }
            };
            this.eventSource.onerror = (_e) => {
                // EventSource doesn't give detailed error info
                console.error("EventSource error.");
                if (this.eventSource?.readyState === EventSource.CLOSED) {
                    if (this.onStatusChangeCallback)
                        this.onStatusChangeCallback("Disconnected");
                }
                else {
                    if (this.onStatusChangeCallback)
                        this.onStatusChangeCallback("Error/Reconnecting");
                }
            };
        }
        catch (e) {
            console.error("Connection error:", e);
            if (this.onStatusChangeCallback)
                this.onStatusChangeCallback("Connection Failed");
        }
    }
    disconnect() {
        let wasConnected = false;
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            wasConnected = true;
        }
        if (this.simulateInterval) {
            clearInterval(this.simulateInterval);
            this.simulateInterval = null;
            wasConnected = true;
        }
        if (wasConnected && this.onStatusChangeCallback) {
            this.onStatusChangeCallback("Disconnected");
        }
    }
    startSimulation(tjaContent, difficulty) {
        this.disconnect();
        console.log("Starting simulation...");
        if (this.onStatusChangeCallback)
            this.onStatusChangeCallback("Connected");
        if (this.onMessageCallback) {
            const gameplayStartEvent = {
                type: "gameplay_start",
                tjaSummaries: [
                    {
                        player: 1,
                        tjaContent: tjaContent || exampleTJA,
                        difficulty: difficulty || "oni",
                    },
                ],
            };
            this.onMessageCallback(gameplayStartEvent);
        }
        this.simulateInterval = window.setInterval(() => {
            const rand = Math.random();
            let randomType = "Perfect";
            if (rand < 0.9) {
                randomType = "Perfect";
            }
            else if (rand < 0.99) {
                randomType = "Good";
            }
            else {
                randomType = "Poor";
            }
            // Random delta between -50 and 50 ms
            const randomDelta = Math.floor(Math.random() * 100) - 50;
            const event = {
                type: "judgement",
                judgement: randomType,
                msDelta: randomDelta,
            };
            if (this.onMessageCallback) {
                this.onMessageCallback(event);
            }
        }, 100 + Math.random() * 200); // 0.1 - 0.3s
    }
    onMessage(callback) {
        this.onMessageCallback = callback;
    }
    onStatusChange(callback) {
        this.onStatusChangeCallback = callback;
    }
}
