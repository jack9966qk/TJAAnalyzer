export function renderChart(bars: string[][], canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("2D rendering context not found for canvas.");
        return;
    }
    
    // Configuration
    const BARS_PER_ROW: number = 4;
    const PADDING: number = 20;

    // Scaling ratios relative to bar width
    // Adjust these to change the relative size of elements
    const RATIOS = {
        BAR_HEIGHT: 0.14,
        ROW_SPACING: 0.09,
        NOTE_RADIUS_SMALL: 0.035,
        NOTE_RADIUS_BIG: 0.050,
        LINE_WIDTH_BAR_BORDER: 0.01,
        LINE_WIDTH_CENTER: 0.005,
        LINE_WIDTH_NOTE_OUTER: 0.022,
        LINE_WIDTH_NOTE_INNER: 0.0075
    };
    
    // Calculate layout
    const canvasWidth: number = canvas.clientWidth || 800;
    // Set internal resolution to match display size (assuming 1:1 for simplicity or fixed width)
    canvas.width = canvasWidth;
    
    const barWidth: number = (canvasWidth - (PADDING * 2)) / BARS_PER_ROW;

    // specific dimensions based on ratios
    const BAR_HEIGHT: number = barWidth * RATIOS.BAR_HEIGHT;
    const ROW_SPACING: number = barWidth * RATIOS.ROW_SPACING;
    const NOTE_RADIUS_SMALL: number = barWidth * RATIOS.NOTE_RADIUS_SMALL;
    const NOTE_RADIUS_BIG: number = barWidth * RATIOS.NOTE_RADIUS_BIG;
    const LW_BAR: number = barWidth * RATIOS.LINE_WIDTH_BAR_BORDER;
    const LW_CENTER: number = barWidth * RATIOS.LINE_WIDTH_CENTER;
    const LW_NOTE_OUTER: number = barWidth * RATIOS.LINE_WIDTH_NOTE_OUTER;
    const LW_NOTE_INNER: number = barWidth * RATIOS.LINE_WIDTH_NOTE_INNER;

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

        drawBarBackground(ctx, x, y, barWidth, BAR_HEIGHT, LW_BAR, LW_CENTER);
    });

    // Layer 2: Draw Notes (so they appear on top of backgrounds, including neighboring bars)
    // Iterate backwards so later bars are drawn first, putting earlier notes (from earlier bars) on top
    for (let index = bars.length - 1; index >= 0; index--) {
        const bar = bars[index];
        const row: number = Math.floor(index / BARS_PER_ROW);
        const col: number = index % BARS_PER_ROW;

        const x: number = PADDING + (col * barWidth);
        const y: number = PADDING + (row * (BAR_HEIGHT + ROW_SPACING));

        drawBarNotes(ctx, bar, x, y, barWidth, BAR_HEIGHT, NOTE_RADIUS_SMALL, NOTE_RADIUS_BIG, LW_NOTE_OUTER, LW_NOTE_INNER);
    }
}

function drawBarBackground(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, borderW: number, centerW: number): void {
    const centerY: number = y + height / 2;

    // Draw Bar Background
    ctx.fillStyle = '#999'; // Darker grey background
    ctx.fillRect(x, y, width, height);
    
    // Draw Bar Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = borderW;
    ctx.strokeRect(x, y, width, height);

    // Draw Center Line
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = centerW;
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    ctx.lineTo(x + width, centerY);
    ctx.stroke();
}

function drawBarNotes(ctx: CanvasRenderingContext2D, bar: string[], x: number, y: number, width: number, height: number, rSmall: number, rBig: number, borderOuterW: number, borderInnerW: number): void {
    const centerY: number = y + height / 2;
    const noteCount: number = bar.length;
    if (noteCount === 0) return;

    const noteStep: number = width / noteCount;

    // Iterate backwards so later notes are drawn first (appearing behind earlier notes)
    for (let i = noteCount - 1; i >= 0; i--) {
        const noteChar = bar[i];
        // Position calculated using the ORIGINAL index 'i'
        const noteX: number = x + (i * noteStep); 
        
        let color: string | null = null;
        let radius: number = 0;
        let isBig: boolean = false;

        switch (noteChar) {
            case '1': // Don (Red Small)
                color = 'rgba(255, 77, 77, 1)';
                radius = rSmall;
                break;
            case '2': // Ka (Blue Small)
                color = 'rgba(92, 187, 255, 1)';
                radius = rSmall;
                break;
            case '3': // Don (Red Big)
                color = 'rgba(255, 77, 77, 1)';
                radius = rBig;
                isBig = true;
                break;
            case '4': // Ka (Blue Big)
                color = 'rgba(92, 187, 255, 1)';
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
            ctx.lineWidth = borderOuterW;
            ctx.strokeStyle = '#000';
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.fill();
            
            ctx.lineWidth = borderInnerW;
            ctx.strokeStyle = '#fff'; // White border
            ctx.stroke();
        }
    }
}