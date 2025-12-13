import { exampleTJA } from "./example-data.js";

export interface JudgementEvent {
    type: 'judgement';
    judgement: string;
}

export interface GameplayStartEvent {
    type: 'gameplay_start';
    tjaSummaries?: {
        player: number;
        tjaContent: string;
        difficulty: string;
    }[];
}

export type ServerEvent = JudgementEvent | GameplayStartEvent;

type EventCallback = (data: ServerEvent) => void;

export class JudgementClient {
    private eventSource: EventSource | null = null;
    private simulateInterval: number | null = null;
    private onMessageCallback: EventCallback | null = null;
    private onStatusChangeCallback: ((status: string) => void) | null = null;

    constructor() {}

    connect(host: string, port: number) {
        this.disconnect();

        const url = `http://${host}:${port}/`;
        console.log(`Connecting to ${url}...`);
        
        try {
            this.eventSource = new EventSource(url);
            
            this.eventSource.onopen = () => {
                console.log("Connected to judgement source.");
                if (this.onStatusChangeCallback) this.onStatusChangeCallback("Connected");
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
                } catch (e) {
                    // Only log if it looks like valid data failed parsing, ignore keep-alives if any
                    if (event.data && event.data.trim() !== '') {
                        console.error("Failed to parse event data", e, event.data);
                    }
                }
            };

            this.eventSource.onerror = (e) => {
                // EventSource doesn't give detailed error info
                console.error("EventSource error.");
                if (this.eventSource?.readyState === EventSource.CLOSED) {
                     if (this.onStatusChangeCallback) this.onStatusChangeCallback("Disconnected");
                } else {
                     if (this.onStatusChangeCallback) this.onStatusChangeCallback("Error/Reconnecting");
                }
            };
        } catch (e) {
             console.error("Connection error:", e);
             if (this.onStatusChangeCallback) this.onStatusChangeCallback("Connection Failed");
        }
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            if (this.onStatusChangeCallback) this.onStatusChangeCallback("Disconnected");
        }
        if (this.simulateInterval) {
            clearInterval(this.simulateInterval);
            this.simulateInterval = null;
        }
    }

    startSimulation() {
        this.disconnect();
        console.log("Starting simulation...");
        
        if (this.onStatusChangeCallback) this.onStatusChangeCallback("Connected");

        if (this.onMessageCallback) {
            const gameplayStartEvent: GameplayStartEvent = {
                type: 'gameplay_start',
                tjaSummaries: [
                    {
                        player: 1,
                        tjaContent: exampleTJA,
                        difficulty: 'oni'
                    }
                ]
            };
            this.onMessageCallback(gameplayStartEvent);
        }

        this.simulateInterval = window.setInterval(() => {
            const types = ['Perfect', 'Good', 'Poor'];
            const randomType = types[Math.floor(Math.random() * types.length)];
            
            const event: JudgementEvent = {
                type: 'judgement',
                judgement: randomType
            };
            
            if (this.onMessageCallback) {
                this.onMessageCallback(event);
            }
        }, 100 + Math.random() * 200); // 0.1 - 0.3s
    }

    onMessage(callback: EventCallback) {
        this.onMessageCallback = callback;
    }

    onStatusChange(callback: (status: string) => void) {
        this.onStatusChangeCallback = callback;
    }
}
