/**
 * Shared logic for saving/sharing files.
 * Supports:
 * 1. Web Share API (navigator.share) for mobile/supported browsers.
 * 2. Neutralino file dialog (desktop app).
 * 3. Browser download fallback (<a> tag).
 */
export async function shareFile(fileName, content, mimeType, dialogTitle) {
    // 1. Prepare Blob
    const blob = new Blob([content], { type: mimeType });
    // 2. Web Share API
    // Note: 'files' support in navigator.share is limited.
    // Check for navigator.canShare({ files: ... })
    try {
        if (navigator.share && navigator.canShare) {
            const file = new File([blob], fileName, { type: mimeType });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: fileName,
                });
                return;
            }
        }
    }
    catch (e) {
        // AbortError means user cancelled the share sheet, which is fine.
        if (e.name === 'AbortError') {
            return;
        }
        console.warn('Web Share API failed, falling back:', e);
    }
    // 3. Neutralino (Desktop App)
    const N = window.Neutralino;
    if (N && N.os && N.os.showSaveDialog) {
        try {
            const extension = fileName.includes('.') ? fileName.split('.').pop() : undefined;
            const entry = await N.os.showSaveDialog(dialogTitle, {
                defaultPath: fileName,
                filters: extension ? [{ name: 'Files', extensions: [extension] }] : []
            });
            if (entry) {
                if (typeof content === 'string') {
                    await N.filesystem.writeFile(entry, content);
                }
                else {
                    await N.filesystem.writeBinaryFile(entry, content);
                }
                return;
            }
            else {
                // User cancelled save dialog
                return;
            }
        }
        catch (e) {
            console.error('Neutralino save failed:', e);
            // Fallback to web download if Neutralino fails? 
            // Usually if N exists, we shouldn't fallback to web download as it might not work in N window.
            // But let's throw to let caller handle or just stop.
            throw e;
        }
    }
    // 4. Web Fallback (Download Link)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a); // Required for Firefox
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
