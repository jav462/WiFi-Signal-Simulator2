// =====================================================
// simulation.js
// Modelo de propagación de la señal WiFi
//
//   P_rx = P_tx - PL(d) - L_paredes
//
//   PL(d) = PL(1 m) + 10 · n · log10(d)      (log-distancia)
//   PL(1 m) = 20·log10(f_MHz) - 27.55         (espacio libre a 1 m)
//   L_pared = atenuación(material, frecuencia) / cos(θ)
// =====================================================

import { segmentsIntersect, getWallLoss } from "./walls.js";

// Cada cuadro de la cuadrícula mide 25 píxeles
export const PIXELS_PER_CELL = 25;

// Exponente de pérdida según el tipo de entorno
export const ENVIRONMENTS = {
    free:   { name: "Espacio libre",   n: 2.0 },
    open:   { name: "Oficina abierta", n: 2.8 },
    indoor: { name: "Interior típico", n: 3.0 },
    dense:  { name: "Interior denso",  n: 3.5 }
};

// Configuración editable desde la interfaz
export const settings = {
    metersPerCell: 1,
    environment: "indoor"
};

// Límite del factor de incidencia: evita que un rayo casi paralelo
// a la pared multiplique su atenuación por más de 2.5
const MIN_COS_INCIDENCE = 0.4;


// Distancia entre dos puntos (en píxeles)
export function calculateDistance(point1, point2) {

    return Math.hypot(point2.x - point1.x, point2.y - point1.y);
}


// Pérdida de referencia a 1 metro (espacio libre)
export function calculateReferenceLoss(frequencyGHz) {

    return 20 * Math.log10(frequencyGHz * 1000) - 27.55;
}


// Pérdida por distancia con el modelo log-distancia
export function calculatePathLoss(distanceMeters, frequencyGHz) {

    // Evitar log(0) y distancias menores a la de referencia
    const distance = Math.max(distanceMeters, 1);

    const n = ENVIRONMENTS[settings.environment].n;

    return calculateReferenceLoss(frequencyGHz) +
        10 * n * Math.log10(distance);
}


// Paredes que cruza el rayo router -> punto
export function getCrossedWalls(router, point, walls) {

    return walls.filter(wall =>
        segmentsIntersect(router.x, router.y, point.x, point.y, wall)
    );
}


// Un rayo oblicuo atraviesa más material: factor = 1 / cos(θ),
// con θ medido respecto a la normal de la pared
function incidenceFactor(router, point, wall) {

    const rx = point.x - router.x;
    const ry = point.y - router.y;
    const wx = wall.x2 - wall.x1;
    const wy = wall.y2 - wall.y1;

    const rayLength = Math.hypot(rx, ry);
    const wallLength = Math.hypot(wx, wy);

    if (rayLength === 0 || wallLength === 0) {
        return 1;
    }

    const cosIncidence =
        Math.abs(rx * wy - ry * wx) / (rayLength * wallLength);

    return 1 / Math.max(cosIncidence, MIN_COS_INCIDENCE);
}


// Pérdida total por las paredes cruzadas
export function calculateWallLoss(router, point, crossedWalls) {

    return crossedWalls.reduce((total, wall) => {

        return total +
            getWallLoss(wall, router.frequency) *
            incidenceFactor(router, point, wall);

    }, 0);
}


// Potencia recibida en un punto desde un router
export function calculateSignal(router, point, walls) {

    const distanceMeters =
        calculateDistance(router, point) /
        PIXELS_PER_CELL * settings.metersPerCell;

    const pathLoss = calculatePathLoss(
        distanceMeters,
        router.frequency
    );

    const crossedWalls = getCrossedWalls(router, point, walls);

    const wallLoss = calculateWallLoss(router, point, crossedWalls);

    return {
        distanceMeters,
        pathLoss,
        wallCount: crossedWalls.length,
        wallLoss,
        receivedPower: router.power - pathLoss - wallLoss
    };
}


// Mejor señal en un punto entre todos los routers activos
// (devuelve null si no hay routers activos)
export function calculateBestSignal(routers, point, walls) {

    let best = null;

    routers.forEach(router => {

        if (!router.active) return;

        const result = calculateSignal(router, point, walls);

        if (!best || result.receivedPower > best.receivedPower) {
            best = { router, ...result };
        }
    });

    return best;
}


// Clasificar la calidad de la señal
export function classifySignal(dbm) {

    if (dbm >= -50) return "Excelente";
    if (dbm >= -60) return "Muy buena";
    if (dbm >= -67) return "Buena";
    if (dbm >= -75) return "Débil";

    return "Muy débil";
}
