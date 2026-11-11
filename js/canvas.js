// =====================================================
// canvas.js
// Dibujo del plano: cuadrícula, mapa de calor, paredes,
// routers y barra de escala
// =====================================================

import { drawRouter } from "./router.js";
import { drawWall } from "./walls.js";
import {
    calculateBestSignal,
    PIXELS_PER_CELL,
    settings
} from "./simulation.js";

const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d");

// Resolución del mapa de calor (px por celda): menor = más fino y más lento
const HEATMAP_CELL = 5;

// Rango de potencia que cubre el gradiente (dBm)
const MIN_DBM = -90;
const MAX_DBM = -40;


// Color continuo: rojo (-90 dBm) -> amarillo (-65) -> verde (-40)
export function signalToColor(dbm) {

    const t = Math.min(1, Math.max(0, (dbm - MIN_DBM) / (MAX_DBM - MIN_DBM)));

    return `hsla(${t * 120}, 85%, 45%, 0.6)`;
}


export function drawHeatmap(routers, walls) {

    for (let x = 0; x < canvas.width; x += HEATMAP_CELL) {

        for (let y = 0; y < canvas.height; y += HEATMAP_CELL) {

            // Centro de la celda
            const point = {
                x: x + HEATMAP_CELL / 2,
                y: y + HEATMAP_CELL / 2
            };

            // Mejor servidor: el router con más potencia en ese punto
            const best = calculateBestSignal(routers, point, walls);

            if (best) {
                ctx.fillStyle = signalToColor(best.receivedPower);
                ctx.fillRect(x, y, HEATMAP_CELL, HEATMAP_CELL);
            }
        }
    }
}


export function drawGrid() {

    ctx.strokeStyle = "rgba(51, 65, 85, 0.7)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += PIXELS_PER_CELL) {

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += PIXELS_PER_CELL) {

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}


// Barra de escala en la esquina inferior izquierda (5 cuadros)
function drawScaleBar() {

    const cells = 5;
    const length = cells * PIXELS_PER_CELL;
    const meters = cells * settings.metersPerCell;

    const x = 15;
    const y = canvas.height - 15;

    ctx.save();

    // Fondo para que se lea sobre el mapa de calor
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.fillRect(x - 8, y - 24, length + 16, 34);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y);
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.moveTo(x + length, y - 5);
    ctx.lineTo(x + length, y + 5);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(meters + " m", x + length / 2, y - 8);

    ctx.restore();
}


// Marca del último punto medido
function drawMeasurePoint(point) {

    ctx.save();

    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}


export function drawPlan({
    walls,
    routers,
    previewWall = null,
    heatmapEnabled = false,
    selectedRouterId = null,
    measurePoint = null
}) {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mapa de calor
    if (heatmapEnabled && routers.length > 0) {
        drawHeatmap(routers, walls);
    }

    drawGrid();

    walls.forEach(wall => drawWall(ctx, wall));

    // Pared provisional mientras se dibuja
    if (previewWall) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        drawWall(ctx, previewWall);
        ctx.restore();
    }

    routers.forEach(router =>
        drawRouter(ctx, router, router.id === selectedRouterId)
    );

    if (measurePoint) {
        drawMeasurePoint(measurePoint);
    }

    drawScaleBar();
}
