# WiFi Signal Simulator

Simulador de propagación de señales inalámbricas sobre un plano 2D.

## Estructura

```
WiFi-Signal-Simulator/
├── index.html
├── css/styles.css
├── js/
│   ├── app.js          # eventos, herramientas y paneles
│   ├── canvas.js       # dibujo: cuadrícula, mapa de calor, escala
│   ├── router.js       # creación y dibujo de routers
│   ├── walls.js        # materiales, dibujo y geometría de paredes
│   └── simulation.js   # modelo de propagación
└── assets/
```

## Cómo ejecutarlo en IntelliJ IDEA

El proyecto usa módulos ES (`type="module"`), así que **no funciona abriendo
`index.html` con doble clic** (el navegador bloquea los módulos en `file://`).
En IntelliJ: clic derecho sobre `index.html` → *Open in* → *Browser*; el servidor
integrado lo sirve por `localhost` y funciona.

## Modelo de propagación

```
P_rx = P_tx − PL(d) − L_paredes

PL(d)   = PL(1 m) + 10·n·log10(d)        (modelo log-distancia)
PL(1 m) = 20·log10(f_MHz) − 27.55        (espacio libre a 1 m)
L_pared = atenuación(material, frecuencia) / cos(θ)
```

- `n` depende del entorno: 2.0 espacio libre, 2.8 oficina abierta,
  3.0 interior típico, 3.5 interior denso.
- La atenuación de cada material cambia con la banda (2.4 / 5 / 6 GHz).
- `θ` es el ángulo entre el rayo y la normal de la pared: un rayo oblicuo
  atraviesa más material (factor limitado a 2.5).
- El mapa de calor muestra, en cada celda, la mejor señal entre los routers activos.

Los valores de atenuación son típicos de la literatura; para un resultado
riguroso hay que calibrarlos con mediciones reales (`MATERIALS` en `walls.js`
y `ENVIRONMENTS` en `simulation.js`).
