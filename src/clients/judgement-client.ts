import { exampleTJA } from "../core/example-data.js";
import { JUDGEABLE_NOTES, type NoteType } from "../core/renderer.js";
import { parseTJA } from "../core/tja-parser.js";

export interface JudgementEvent {
  type: "judgement";
  judgement: string;
  msDelta?: number;
  noteChar: string;
  noteOrdinalByChar: number;
}

export interface GameplayStartEvent {
  type: "gameplay_start";
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
          if (event.data && event.data.trim() !== "") {
            console.error("Failed to parse event data", e, event.data);
          }
        }
      };

      this.eventSource.onerror = (_e) => {
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

  private cleanup() {
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
    return wasConnected;
  }

  disconnect() {
    const wasConnected = this.cleanup();

    if (wasConnected && this.onStatusChangeCallback) {
      this.onStatusChangeCallback("Disconnected");
    }
  }

  startSimulation(tjaContent?: string, difficulty?: string) {
    this.cleanup();
    console.log("Starting simulation...");

    if (this.onStatusChangeCallback) this.onStatusChangeCallback("Connected");

    const content = tjaContent || exampleTJA;
    const diff = difficulty || "oni";

    if (this.onMessageCallback) {
      const gameplayStartEvent: GameplayStartEvent = {
        type: "gameplay_start",
        tjaSummaries: [
          {
            player: 1,
            tjaContent: content,
            difficulty: diff,
          },
        ],
      };
      this.onMessageCallback(gameplayStartEvent);
    }

    // Prepare simulation data
    const parsed = parseTJA(content);
    const chart = parsed[diff] || Object.values(parsed)[0];

    if (!chart) {
      console.error("Simulation failed: Could not parse chart");
      return;
    }

    // Flatten notes to list
    const notes: { type: string; ordinal: number }[] = [];
    const ordinalCounters: Record<string, number> = {};

    for (const bar of chart.bars) {
      for (const char of bar) {
        if (JUDGEABLE_NOTES.includes(char as NoteType)) {
          if (ordinalCounters[char] === undefined) ordinalCounters[char] = 0;
          notes.push({ type: char, ordinal: ordinalCounters[char] });
          ordinalCounters[char]++;
        }
      }
    }

    let currentNoteIndex = 0;

    this.simulateInterval = window.setInterval(
      () => {
        if (currentNoteIndex >= notes.length) {
          if (this.simulateInterval) clearInterval(this.simulateInterval);
          return;
        }

        const note = notes[currentNoteIndex];
        currentNoteIndex++;

        const rand = Math.random();
        let randomType = "perfect";
        if (rand < 0.9) {
          randomType = "perfect";
        } else if (rand < 0.99) {
          randomType = "good";
        } else {
          randomType = "poor";
        }

        // Random delta between -50 and 50 ms
        const randomDelta = Math.floor(Math.random() * 100) - 50;

        const event: JudgementEvent = {
          type: "judgement",
          judgement: randomType,
          msDelta: randomDelta,
          noteChar: note.type,
          noteOrdinalByChar: note.ordinal,
        };

        if (this.onMessageCallback) {
          this.onMessageCallback(event);
        }
      },
      100 + Math.random() * 200,
    ); // 0.1 - 0.3s
  }

  onMessage(callback: EventCallback) {
    this.onMessageCallback = callback;
  }

  onStatusChange(callback: (status: string) => void) {
    this.onStatusChangeCallback = callback;
  }
}
