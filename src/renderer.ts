export function renderChart(bars: string[][], canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("2D rendering context not found for canvas.");
        return;
    }
    
    // Configuration
    const BARS_PER_ROW: number = 4;
    const BAR_HEIGHT: number = 80;
    const PADDING: number = 20;
    const ROW_SPACING: number = 40;
    const NOTE_RADIUS_SMALL: number = 12;
    const NOTE_RADIUS_BIG: number = 18;
    
    // Calculate layout
    const canvasWidth: number = canvas.clientWidth || 800;
    // Set internal resolution to match display size (assuming 1:1 for simplicity or fixed width)
    canvas.width = canvasWidth;
    
    const barWidth: number = (canvasWidth - (PADDING * 2)) / BARS_PER_ROW;
    const totalRows: number = Math.ceil(bars.length / BARS_PER_ROW);
    const canvasHeight: number = (totalRows * (BAR_HEIGHT + ROW_SPACING)) + (PADDING * 2);
    canvas.height = canvasHeight;

    // Clear
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Layer 1: Draw Bar Backgrounds/Borders and Center Lines
    bars.forEach((bar: string[], index: number) => {
        const row: number = Math.floor(index / BARS_PER_ROW);
        const col: number = index % BARS_PER_ROW;

        const x: number = PADDING + (col * barWidth);
        const y: number = PADDING + (row * (BAR_HEIGHT + ROW_SPACING));

        drawBarBackground(ctx, x, y, barWidth, BAR_HEIGHT);
    });

    // Layer 2: Draw Notes (so they appear on top of backgrounds, including neighboring bars)
    bars.forEach((bar: string[], index: number) => {
        const row: number = Math.floor(index / BARS_PER_ROW);
        const col: number = index % BARS_PER_ROW;

        const x: number = PADDING + (col * barWidth);
        const y: number = PADDING + (row * (BAR_HEIGHT + ROW_SPACING));

        drawBarNotes(ctx, bar, x, y, barWidth, BAR_HEIGHT, NOTE_RADIUS_SMALL, NOTE_RADIUS_BIG);
    });
}

function drawBarBackground(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const centerY: number = y + height / 2;

    // Draw Bar Background
    ctx.fillStyle = '#999'; // Darker grey background
    ctx.fillRect(x, y, width, height);
    
    // Draw Bar Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Draw Center Line
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    ctx.lineTo(x + width, centerY);
    ctx.stroke();
}

function drawBarNotes(ctx: CanvasRenderingContext2D, bar: string[], x: number, y: number, width: number, height: number, rSmall: number, rBig: number): void {
    const centerY: number = y + height / 2;
    const noteCount: number = bar.length;
    if (noteCount === 0) return;

    const noteStep: number = width / noteCount;

    // Iterate backwards so later notes are drawn first (appearing behind earlier notes)
    for (let i = noteCount - 1; i >= 0; i--) {
        const noteChar = bar[i];
        // Position calculated using the ORIGINAL index 'i'
        const noteX: number = x + (i * noteStep) + (noteStep / 2); 
        
        let color: string | null = null;
        let radius: number = 0;
        let isBig: boolean = false;

        switch (noteChar) {
            case '1': // Don (Red Small)
                color = '#f00';
                radius = rSmall;
                break;
            case '2': // Ka (Blue Small)
                color = '#00f';
                radius = rSmall;
                break;
            case '3': // Don (Red Big)
                color = '#f00';
                radius = rBig;
                isBig = true;
                break;
            case '4': // Ka (Blue Big)
                color = '#00f';
                radius = rBig;
                isBig = true;
                break;
            case '5': // Roll (Yellow)
            case '6': // Big Roll
            case '7': // Balloon
            case '9': // Kusudama
                color = '#ff0'; // Yellow
                radius = (noteChar === '6' || noteChar === '9') ? rBig : rSmall;
                break;
            // '0' is space
            // '8' is end of roll (ignore for point rendering)
        }

        if (color) {
            ctx.beginPath();
            ctx.arc(noteX, centerY, radius, 0, Math.PI * 2);

            // Black border (outside)
            ctx.lineWidth = 4.5;
            ctx.strokeStyle = '#000';
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.fill();
            
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#fff'; // White border
            ctx.stroke();
        }
    }
}