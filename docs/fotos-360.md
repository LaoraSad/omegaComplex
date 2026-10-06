# Ficha técnica — Fotos 360 en alta resolución (Fase 3)

Objetivo: reemplazar las 19 fotos actuales (1376px o 1024px, ~400 KB) por
equirectangulares reales que el visor WebGL pueda mostrar nítidas.

## Requisitos técnicos (para las 19, sin excepción)

| Parámetro | Valor exigido |
|---|---|
| Proyección | Equirectangular 2:1 exacta |
| Dimensiones | **4096 × 2048 px** (mínimo aceptable: 3840 × 1920) |
| Formato de entrega | JPEG calidad 80+ o PNG sin pérdida |
| Horizonte | Centrado verticalmente (línea del horizonte al 50% de la altura) |
| Nadir / cenit | Sin trípode visible, sin logos; rellenar con piso/techo coherente |
| Personas | Sin rostros reconocibles (espaldas, distancia o vacías) |
| Luz | Atardecer cálido en exteriores; interior cálido y brillante (coherente con la landing actual) |
| Nombre de archivo | **El mismo basename actual** (ej. `wave_pool.jpg`) — el script `npm run optimize:360` las detecta solo |

## ⚠️ Requisito crítico: continuidad de la costura

En una equirectangular, el borde izquierdo y el derecho son el MISMO punto
al girar 360°. Si no coinciden, se ve una línea vertical al rotar.

- **Si se generan con IA:** pedir explícitamente `seamless horizontal tileable panorama, left and right edges match perfectly`.
- **Validación:** abrir la imagen, desplazarla horizontalmente 50% (offset) y comprobar que no aparece ninguna línea ni salto en el centro (que era la costura). En Photoshop: Filtro → Otro → Desplazar. En GIMP: Capa → Transformar → Desplazamiento.

## Dónde entregarlas

Soltarlas en `public/360-originals/` (crear la carpeta) con los mismos nombres.
Luego correr `npm run optimize:360`: genera AVIF+WebP+blur y el visor las
toma automáticamente (AVIF → WebP → JPG según el navegador).

## Las 19 fotos

### Piscinas
1. `kids_pool.jpg` — Piscina infantil con juegos de agua, poca profundidad, colores alegres, vacía o niños a distancia de espaldas.
2. `wave_pool.jpg` — Piscina de olas en funcionamiento, atardecer, toboganes al fondo.
3. `slide_pool.jpg` — Piscina con tobogán acuático principal, vista desde el borde.
4. `bowl_slide.jpg` — Tobogán tipo tazón (bowl), estructura completa visible.
5. `adult_pool.jpg` — Piscina semiolímpica de adultos, carriles marcados, agua calma.
6. `infinity.jpg` — Piscina infinity al atardecer, borde infinito hacia el paisaje.

### Canchas
7. `campo_futbol11.jpg` — Cancha de fútbol 11 de grama, porterías, atardecer.
8. `microfutbol_sintetica.jpg` — Cancha de microfútbol en sintética descubierta.
9. `microfutbol_cubierta.jpg` — Cancha de microfútbol cubierta, estructura de techo visible.
10. `cancha_padel.jpg` — Cancha de pádel con cristales, red y palas.
11. `cancha_tenis.jpg` — Cancha de tenis, red central, superficie impecable.
12. `poli_soccer.jpg` — Polideportivo fútbol sala, demarcación múltiple.
13. `poli_volleyball.jpg` — Polideportivo voleibol, red puesta.
14. `poli_basketball.jpg` — Polideportivo baloncesto, tableros y aros.

### Gimnasio y zona húmeda
15. `gym.jpg` — Gimnasio equipado (mancuernas, máquinas, cardio), iluminado, ordenado.
16. `turco.jpg` — Baño turco, bancas de mármol, vapor leve.
17. `sauna.jpg` — Sauna en madera, bancas en niveles, luz cálida tenue.
18. `indoor.jpg` — Piscina cubierta/climatizada, techo alto, luz natural lateral.
19. `rooftop.jpg` — Terraza/mirador del complejo al atardecer, vista general.

## Orden sugerido de producción

Primero las 6 de mayor tráfico (hero + cards principales): `campo_futbol11`,
`microfutbol_cubierta`, `wave_pool`, `infinity`, `gym`, `kids_pool`. Con esas
6 la percepción de calidad de toda la app cambia; el resto puede ir después.
