// =====================================================
// walls.js
// Materiales, dibujo y geometría de las paredes
// =====================================================

// Cada material tiene un color de dibujo y una atenuación (dB)
// según la banda de frecuencia. Son valores típicos de la literatura:
// conviene calibrarlos con mediciones reales.
export const MATERIALS = {
    wood: {
        name: "Madera",
        color: "#d6a15d",
        loss: { 2.4: 3, 5: 4, 6: 5 }
    },
    brick: {
        name: "Ladrillo",
        color: "#b4533c",
        loss: { 2.4: 7, 5: 10, 6: 12 }
    },
    concrete: {
        name: "Hormigón",
        color: "#94a3b8",
        loss: { 2.4: 12, 5: 16, 6: 20 }
    }
};

const DEFAULT_WALL_LOSS = 5;


// Crear una pared
export function createWall(x1, y1, x2, y2, material) {

    return { x1, y1, x2, y2, material };
}


// Atenuación base (dB) de una pared para una frecuencia
export function getWallLoss(wall, frequencyGHz) {

    const material = MATERIALS[wall.material];

    if (!material) {
        return DEFAULT_WALL_LOSS;
    }

    return material.loss[frequencyGHz] ?? material.loss[2.4];
}


// Dibujar una pared
export function drawWall(ctx, wall) {

    const material = MATERIALS[wall.material];

    ctx.save();

    ctx.beginPath();

    ctx.moveTo(wall.x1, wall.y1);
    ctx.lineTo(wall.x2, wall.y2);

    ctx.strokeStyle = material ? material.color : "#f97316";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";

    ctx.stroke();

    ctx.restore();
}


// Comprobar si el segmento (x1,y1)-(x2,y2) cruza una pared
export function segmentsIntersect(x1, y1, x2, y2, wall) {

    const denominator =
        (x2 - x1) * (wall.y2 - wall.y1) -
        (y2 - y1) * (wall.x2 - wall.x1);

    // Segmentos paralelos
    if (denominator === 0) {
        return false;
    }

    const t =
        ((wall.x1 - x1) * (wall.y2 - wall.y1) -
            (wall.y1 - y1) * (wall.x2 - wall.x1)) / denominator;

    const u =
        ((wall.x1 - x1) * (y2 - y1) -
            (wall.y1 - y1) * (x2 - x1)) / denominator;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}


// Distancia entre un punto y una pared
export function distanceToSegment(point, wall) {

    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;

    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
        return Math.hypot(point.x - wall.x1, point.y - wall.y1);
    }

    let t = (
        (point.x - wall.x1) * dx +
        (point.y - wall.y1) * dy
    ) / lengthSquared;

    t = Math.max(0, Math.min(1, t));

    return Math.hypot(
        point.x - (wall.x1 + t * dx),
        point.y - (wall.y1 + t * dy)
    );
}


// Índice de la pared más cercana al punto (o -1 si no hay ninguna)
export function findWallAt(point, walls, tolerance = 12) {

    let closestIndex = -1;
    let minDistance = tolerance;

    walls.forEach((wall, index) => {

        const distance = distanceToSegment(point, wall);

        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });

    return closestIndex;
}
