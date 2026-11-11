// =====================================================
// router.js
// Creación y dibujo de routers
// =====================================================

// Crear un router
export function createRouter(x, y, id) {

    return {
        id: id,
        name: "Router " + id,
        x: x,
        y: y,
        frequency: 2.4,
        power: 20,
        active: true
    };
}


// Dibujar router
export function drawRouter(ctx, router, selected = false) {

    ctx.save();

    // Anillo de selección
    if (selected) {
        ctx.beginPath();
        ctx.arc(router.x, router.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Círculo del router (gris si está inactivo)
    ctx.beginPath();
    ctx.arc(router.x, router.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = router.active ? "#38bdf8" : "#64748b";
    ctx.fill();

    // Borde
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Nombre
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Arial";
    ctx.fillText(router.name, router.x + 16, router.y - 10);

    ctx.restore();
}
