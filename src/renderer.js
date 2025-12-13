
export function renderChart(bars, canvas) {
    const ctx = canvas.getContext('2d');
    
    // Configuration
    const BARS_PER_ROW = 4;
    const BAR_HEIGHT = 80;
    const PADDING = 20;
    const ROW_SPACING = 40;
    const NOTE_RADIUS_SMALL = 12;
    const NOTE_RADIUS_BIG = 18;
    
    // Calculate layout
    const canvasWidth = canvas.clientWidth || 800;
    // Set internal resolution to match display size (assuming 1:1 for simplicity or fixed width)
    canvas.width = canvasWidth;
    
    const barWidth = (canvasWidth - (PADDING * 2)) / BARS_PER_ROW;
    const totalRows = Math.ceil(bars.length / BARS_PER_ROW);
    const canvasHeight = (totalRows * (BAR_HEIGHT + ROW_SPACING)) + (PADDING * 2);
    canvas.height = canvasHeight;

    // Clear
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw
    bars.forEach((bar, index) => {
        const row = Math.floor(index / BARS_PER_ROW);
        const col = index % BARS_PER_ROW;

        const x = PADDING + (col * barWidth);
        const y = PADDING + (row * (BAR_HEIGHT + ROW_SPACING));

        drawBar(ctx, bar, x, y, barWidth, BAR_HEIGHT, NOTE_RADIUS_SMALL, NOTE_RADIUS_BIG);
    });
}

function drawBar(ctx, bar, x, y, width, height, rSmall, rBig) {
    const centerY = y + height / 2;

    // Draw Bar Background/Border
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

    // Draw Notes
    const noteCount = bar.length;
    if (noteCount === 0) return;

    const noteStep = width / noteCount;

    bar.forEach((noteChar, noteIndex) => {
        const noteX = x + (noteIndex * noteStep) + (noteStep / 2); // Center of the time slot
        
        let color = null;
        let radius = 0;
        let isBig = false;

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
            ctx.fillStyle = color;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#000';
            ctx.stroke();

            // Inner white circle for "face" of the drum? 
            // Standard Taiko notes are solid, but let's stick to simple circles.
            // Maybe a white center for 'face' style is too much detail for "simple".
        }
    });
}
