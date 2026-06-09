// Preload runs before the page in an isolated context. DEEPER is fully self-contained
// (no privileged APIs needed), so we expose nothing — just a marker for the renderer.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('DEEPER_DESKTOP', { isDesktop: true });
