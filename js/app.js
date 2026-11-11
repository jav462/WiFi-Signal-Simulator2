// =====================================================
// app.js
// Interacción con el usuario: herramientas, eventos del mouse,
// paneles y guardado del plano
// =====================================================

import { drawPlan } from "./canvas.js";
import { createRouter } from "./router.js";
import { createWall, findWallAt } from "./walls.js";
import {
    calculateSignal,
    calculateBestSignal,
    classifySignal,
    settings,
    ENVIRONMENTS,
    PIXELS_PER_CELL
} from "./simulation.js";


// ---------- Elementos HTML ----------
const canvas = document.getElementById("simulationCanvas");

const btnSelect = document.getElementById("btnSelect");
const btnRouter = document.getElementById("btnRouter");
const btnMoveRouter = document.getElementById("btnMoveRouter");
const btnWall = document.getElementById("btnWall");
const btnChangeWallMaterial = document.getElementById("btnChangeWallMaterial");
const btnDelete = document.getElementById("btnDelete");
const btnClear = document.getElementById("btnClear");
const btnMeasure = document.getElementById("btnMeasure");
const btnHeatmap = document.getElementById("btnHeatmap");

const btnSave = document.getElementById("btnSave");
const btnLoad = document.getElementById("btnLoad");
const btnExport = document.getElementById("btnExport");
const fileInput = document.getElementById("fileInput");

const wallMaterial = document.getElementById("wallMaterial");
const environmentSelect = document.getElementById("environmentSelect");
const scaleSelect = document.getElementById("scaleSelect");

const coordinates = document.getElementById("coordinates");
const wallCount = document.getElementById("wallCount");
const routerCount = document.getElementById("routerCount");

const routerList = document.getElementById("routerList");
const routerProperties = document.getElementById("routerProperties");
const signalResults = document.getElementById("signalResults");

const statsRouterCount = document.getElementById("statsRouterCount");
const statsWallCount = document.getElementById("statsWallCount");
const activeToolInfo = document.getElementById("activeToolInfo");
const heatmapInfo = document.getElementById("heatmapInfo");

const tooltip = document.getElementById("tooltip");


// ---------- Datos del simulador ----------
let walls = [];
let routers = [];
let nextRouterId = 1;

let currentTool = "select";
let isDrawing = false;
let isMovingRouter = false;
let previewWall = null;
let selectedRouter = null;
let measurePoint = null;
let heatmapEnabled = false;

const TOOL_LABELS = {
    select: "Seleccionar",
    router: "Agregar router",
    moveRouter: "Mover router",
    wall: "Dibujar pared",
    changeMaterial: "Cambiar material",
    delete: "Eliminar",
    measure: "Medir señal"
};


// ---------- Utilidades ----------

// Evita que un nombre con caracteres especiales rompa el HTML
function escapeHtml(text) {

    return String(text).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[character]));
}

// Posición del mouse dentro del canvas (limitada a los bordes)
function getMousePosition(event) {

    const rect = canvas.getBoundingClientRect();

    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;

    return {
        x: Math.min(Math.max(x, 0), canvas.width),
        y: Math.min(Math.max(y, 0), canvas.height)
    };
}

// Ajustar coordenadas a la cuadrícula
function snapToGrid(point) {

    return {
        x: Math.round(point.x / PIXELS_PER_CELL) * PIXELS_PER_CELL,
        y: Math.round(point.y / PIXELS_PER_CELL) * PIXELS_PER_CELL
    };
}

function pixelsToMeters(pixels) {

    return pixels / PIXELS_PER_CELL * settings.metersPerCell;
}

// Buscar router cercano al clic
function findRouter(point) {

    return routers.find(router =>
        Math.hypot(point.x - router.x, point.y - router.y) <= 18
    );
}

// Descargar un archivo generado en el navegador
function downloadBlob(blob, fileName) {

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(link.href);
}


// ---------- Dibujo ----------

// Redibuja como máximo una vez por fotograma
let renderPending = false;

function render() {

    if (renderPending) return;

    renderPending = true;

    requestAnimationFrame(() => {

        renderPending = false;

        drawPlan({
            walls,
            routers,
            previewWall,
            heatmapEnabled,
            selectedRouterId: selectedRouter ? selectedRouter.id : null,
            measurePoint
        });
    });
}


// ---------- Herramientas ----------
function changeTool(tool, button) {

    currentTool = tool;

    document.querySelectorAll(".toolbar button")
        .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");

    if (heatmapEnabled) {
        btnHeatmap.classList.add("active");
    }

    updateInfo();
}


// ---------- Paneles de información ----------
function updateInfo() {

    wallCount.textContent = "Paredes: " + walls.length;
    routerCount.textContent = "Routers: " + routers.length;

    statsRouterCount.textContent = "Routers: " + routers.length;
    statsWallCount.textContent = "Paredes: " + walls.length;

    activeToolInfo.textContent =
        "Herramienta: " + TOOL_LABELS[currentTool];

    heatmapInfo.textContent =
        "Mapa de calor: " + (heatmapEnabled ? "Activado" : "Desactivado");

    renderRouterList();
}


function renderRouterList() {

    if (routers.length === 0) {
        routerList.innerHTML = "<p>No hay routers registrados.</p>";
        return;
    }

    routerList.innerHTML = "";

    routers.forEach(router => {

        const item = document.createElement("button");

        item.className = "router-item";

        if (selectedRouter && selectedRouter.id === router.id) {
            item.classList.add("selected");
        }

        item.innerHTML = `
            <strong>${escapeHtml(router.name)}</strong>
            <br>
            <small>${router.frequency} GHz | ${router.power} dBm</small>
            <br>
            <small>${router.active ? "Activo" : "Inactivo"}</small>
        `;

        item.addEventListener("click", () => {

            selectedRouter = router;

            showRouterProperties(router);
            renderRouterList();
            render();
        });

        routerList.appendChild(item);
    });
}


function showRouterProperties(router) {

    if (!router) {
        routerProperties.innerHTML =
            "<p>Selecciona un router para configurarlo.</p>";
        return;
    }

    routerProperties.innerHTML = `
        <label for="routerName">Nombre:</label>
        <input type="text" id="routerName">

        <label for="routerFrequency">Frecuencia:</label>
        <select id="routerFrequency">
            <option value="2.4">2.4 GHz</option>
            <option value="5">5 GHz</option>
            <option value="6">6 GHz</option>
        </select>

        <label for="routerPower">Potencia (dBm):</label>
        <input type="number" id="routerPower" min="10" max="30">

        <label class="checkbox-label">
            <input type="checkbox" id="routerActive">
            Router activo
        </label>
    `;

    const nameInput = document.getElementById("routerName");
    const frequencyInput = document.getElementById("routerFrequency");
    const powerInput = document.getElementById("routerPower");
    const activeInput = document.getElementById("routerActive");

    // Mostrar valores actuales
    nameInput.value = router.name;
    frequencyInput.value = router.frequency;
    powerInput.value = router.power;
    activeInput.checked = router.active;

    nameInput.addEventListener("input", () => {
        router.name = nameInput.value;
        renderRouterList();
        render();
    });

    frequencyInput.addEventListener("change", () => {
        router.frequency = Number(frequencyInput.value);
        renderRouterList();
        render();
    });

    powerInput.addEventListener("change", () => {

        const power = Number(powerInput.value);

        if (power >= 10 && power <= 30) {
            router.power = power;
            renderRouterList();
            render();
        } else {
            powerInput.value = router.power;
            alert("La potencia debe estar entre 10 y 30 dBm.");
        }
    });

    activeInput.addEventListener("change", () => {
        router.active = activeInput.checked;
        renderRouterList();
        render();
    });
}


// ---------- Medición ----------
function measureSignal(point) {

    const activeRouters = routers.filter(router => router.active);

    if (activeRouters.length === 0) {
        signalResults.innerHTML =
            "<p>No hay routers activos en el plano.</p>";
        return;
    }

    // Del router con mejor señal al peor
    const results = activeRouters
        .map(router => ({
            router,
            signal: calculateSignal(router, point, walls)
        }))
        .sort((a, b) =>
            b.signal.receivedPower - a.signal.receivedPower
        );

    signalResults.innerHTML = results.map(({ router, signal }) => `
        <div class="signal-result">
            <h3>${escapeHtml(router.name)}</h3>
            <p>Distancia: ${signal.distanceMeters.toFixed(2)} m</p>
            <p>Paredes: ${signal.wallCount}</p>
            <p>Pérdida por distancia: ${signal.pathLoss.toFixed(1)} dB</p>
            <p>Pérdida por paredes: ${signal.wallLoss.toFixed(1)} dB</p>
            <p>Frecuencia: ${router.frequency} GHz</p>
            <p>Potencia recibida:
                <strong>${signal.receivedPower.toFixed(2)} dBm</strong>
            </p>
            <p>Calidad: ${classifySignal(signal.receivedPower)}</p>
        </div>
    `).join("");
}


// ---------- Eliminar ----------
function deleteAt(point) {

    // Primero routers, luego paredes
    const router = findRouter(point);

    if (router) {

        routers = routers.filter(r => r !== router);

        if (selectedRouter === router) {
            selectedRouter = null;
            showRouterProperties(null);
        }

        updateInfo();
        render();
        return;
    }

    const index = findWallAt(point, walls);

    if (index !== -1) {
        walls.splice(index, 1);
        updateInfo();
        render();
    }
}


// ---------- Etiqueta flotante con la señal bajo el cursor ----------
function hideTooltip() {

    tooltip.classList.add("hidden");
}

function updateTooltip(event, point) {

    if (isDrawing || isMovingRouter) {
        hideTooltip();
        return;
    }

    const best = calculateBestSignal(routers, point, walls);

    if (!best) {
        hideTooltip();
        return;
    }

    tooltip.textContent =
        `${best.receivedPower.toFixed(1)} dBm · ${best.router.name}`;

    tooltip.style.left = (event.clientX + 14) + "px";
    tooltip.style.top = (event.clientY + 14) + "px";

    tooltip.classList.remove("hidden");
}


// ---------- Botones de herramientas ----------
btnSelect.addEventListener("click", () => changeTool("select", btnSelect));
btnRouter.addEventListener("click", () => changeTool("router", btnRouter));
btnMoveRouter.addEventListener("click", () => changeTool("moveRouter", btnMoveRouter));
btnWall.addEventListener("click", () => changeTool("wall", btnWall));
btnChangeWallMaterial.addEventListener("click", () => changeTool("changeMaterial", btnChangeWallMaterial));
btnDelete.addEventListener("click", () => changeTool("delete", btnDelete));
btnMeasure.addEventListener("click", () => changeTool("measure", btnMeasure));

btnHeatmap.addEventListener("click", () => {

    heatmapEnabled = !heatmapEnabled;

    btnHeatmap.classList.toggle("active", heatmapEnabled);

    updateInfo();
    render();
});

btnClear.addEventListener("click", () => {

    if ((walls.length > 0 || routers.length > 0) &&
        !confirm("¿Seguro que quieres limpiar todo el plano?")) {
        return;
    }

    walls = [];
    routers = [];
    nextRouterId = 1;

    previewWall = null;
    measurePoint = null;
    selectedRouter = null;

    isDrawing = false;
    isMovingRouter = false;

    showRouterProperties(null);
    updateInfo();
    render();
});


// ---------- Modelo de propagación ----------
environmentSelect.addEventListener("change", () => {

    settings.environment = environmentSelect.value;
    render();
});

scaleSelect.addEventListener("change", () => {

    settings.metersPerCell = Number(scaleSelect.value);
    render();
});


// ---------- Eventos del mouse ----------
canvas.addEventListener("mousedown", event => {

    const raw = getMousePosition(event);
    const point = snapToGrid(raw);

    switch (currentTool) {

        case "select":
            selectedRouter = findRouter(point) || null;
            showRouterProperties(selectedRouter);
            renderRouterList();
            render();
            break;

        case "measure":
            measurePoint = raw;
            measureSignal(raw);
            render();
            break;

        case "router": {
            const router = createRouter(point.x, point.y, nextRouterId);

            routers.push(router);
            nextRouterId++;

            updateInfo();
            render();
            break;
        }

        case "wall":
            isDrawing = true;

            previewWall = createWall(
                point.x, point.y,
                point.x, point.y,
                wallMaterial.value
            );
            break;

        case "changeMaterial": {
            const index = findWallAt(point, walls, 15);

            if (index !== -1) {
                walls[index].material = wallMaterial.value;
                render();
            }
            break;
        }

        case "delete":
            deleteAt(point);
            break;

        case "moveRouter":
            selectedRouter = findRouter(point) || null;

            if (selectedRouter) {
                isMovingRouter = true;
                showRouterProperties(selectedRouter);
                renderRouterList();
            }
            break;
    }
});


canvas.addEventListener("mousemove", event => {

    const raw = getMousePosition(event);
    const point = snapToGrid(raw);

    coordinates.textContent =
        `X: ${pixelsToMeters(point.x).toFixed(1)} m | ` +
        `Y: ${pixelsToMeters(point.y).toFixed(1)} m`;

    // Pared provisional
    if (isDrawing) {
        previewWall.x2 = point.x;
        previewWall.y2 = point.y;
        render();
    }

    // Mover router seleccionado
    if (isMovingRouter && selectedRouter) {
        selectedRouter.x = point.x;
        selectedRouter.y = point.y;
        render();
    }

    updateTooltip(event, raw);
});

canvas.addEventListener("mouseleave", hideTooltip);


// Se escucha en window para no dejar una pared "pegada" si se
// suelta el botón fuera del canvas
window.addEventListener("mouseup", event => {

    if (isDrawing) {

        const point = snapToGrid(getMousePosition(event));

        previewWall.x2 = point.x;
        previewWall.y2 = point.y;

        const isJustAPoint =
            previewWall.x1 === previewWall.x2 &&
            previewWall.y1 === previewWall.y2;

        // Ignorar paredes de longitud cero (un simple clic)
        if (!isJustAPoint) {
            walls.push(createWall(
                previewWall.x1, previewWall.y1,
                previewWall.x2, previewWall.y2,
                previewWall.material
            ));
        }

        isDrawing = false;
        previewWall = null;

        updateInfo();
        render();
    }

    isMovingRouter = false;
});


// ---------- Guardar, cargar y exportar ----------
btnSave.addEventListener("click", () => {

    const data = {
        version: 1,
        walls,
        routers,
        nextRouterId,
        settings: {
            metersPerCell: settings.metersPerCell,
            environment: settings.environment
        }
    };

    downloadBlob(
        new Blob([JSON.stringify(data, null, 2)],
            { type: "application/json" }),
        "plano-wifi.json"
    );
});

btnLoad.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {

    const file = fileInput.files[0];

    if (file) {
        loadPlan(file);
    }

    // Permite volver a cargar el mismo archivo
    fileInput.value = "";
});

function loadPlan(file) {

    const reader = new FileReader();

    reader.onload = () => {

        try {

            const data = JSON.parse(reader.result);

            if (!Array.isArray(data.walls) || !Array.isArray(data.routers)) {
                throw new Error("el archivo no tiene el formato esperado.");
            }

            walls = data.walls.map(w => createWall(
                Number(w.x1), Number(w.y1),
                Number(w.x2), Number(w.y2),
                w.material
            ));

            routers = data.routers.map(r => ({
                ...createRouter(Number(r.x), Number(r.y), Number(r.id)),
                ...r
            }));

            nextRouterId = Math.max(0, ...routers.map(r => r.id)) + 1;

            // Configuración del modelo (solo valores válidos)
            const loaded = data.settings || {};
            const validScales = [...scaleSelect.options]
                .map(option => Number(option.value));

            if (ENVIRONMENTS[loaded.environment]) {
                settings.environment = loaded.environment;
            }

            if (validScales.includes(loaded.metersPerCell)) {
                settings.metersPerCell = loaded.metersPerCell;
            }

            environmentSelect.value = settings.environment;
            scaleSelect.value = String(settings.metersPerCell);

            selectedRouter = null;
            measurePoint = null;
            previewWall = null;

            showRouterProperties(null);
            updateInfo();
            render();

        } catch (error) {
            alert("No se pudo cargar el plano: " + error.message);
        }
    };

    reader.readAsText(file);
}

// La imagen exportada lleva fondo oscuro (el canvas es transparente)
btnExport.addEventListener("click", () => {

    const exportCanvas = document.createElement("canvas");

    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;

    const exportCtx = exportCanvas.getContext("2d");

    exportCtx.fillStyle = "#0f172a";
    exportCtx.fillRect(0, 0, canvas.width, canvas.height);
    exportCtx.drawImage(canvas, 0, 0);

    exportCanvas.toBlob(blob => downloadBlob(blob, "mapa-wifi.png"));
});


// ---------- Estado inicial ----------
environmentSelect.value = settings.environment;
scaleSelect.value = String(settings.metersPerCell);

changeTool("select", btnSelect);
showRouterProperties(null);
render();
