# Ad Blocker 🛡️

Bloqueador de anuncios y rastreadores.

Extensión **Manifest V3** para Chrome, Edge, Brave y otros navegadores Chromium.

## Qué hace

Bloquea anuncios de dos maneras:

1. **Bloqueo de red** — 28.000+ dominios de anuncios/rastreadores bloqueados con
   `declarativeNetRequest`, así las peticiones ni siquiera llegan a cargarse.
2. **Ocultación de elementos** — 13.000+ filtros cosméticos que eliminan los
   huecos y contenedores de anuncios que quedan en la página.

Los archivos `rules.json` (red) y `content.css` (cosmético) son pre-generados.
Para regenerarlos ejecuta `python build/filters.py`.

## Instalación (modo desarrollador)

1. Clona o descarga este repositorio.
2. Abre la página de extensiones de tu navegador:
   - Chrome/Edge/Brave: `chrome://extensions` / `edge://extensions`
3. Activa **Modo de desarrollador** (interruptor arriba a la derecha).
4. Pulsa **Cargar descomprimida** y selecciona la carpeta del repositorio.
5. Listo — los anuncios quedan bloqueados. Pulsa el icono para activar/desactivar.

## Características

- Bloquea anuncios, rastreadores, pop-ups y scripts de analítica en todas las webs.
- Interruptor on/off desde el popup.
- Contador de sesión con las peticiones bloqueadas.
- Sin cuentas, sin código remoto, sin analítica propia.

## Estructura

```
.
├── manifest.json      # metadatos + permisos + reglas
├── background.js      # service worker: activa reglas, toggle, badge
├── rules.json         # reglas de bloqueo declarativeNetRequest
├── content.js         # ocultación dinámica + MutationObserver
├── content.css        # selectores cosméticos de ocultación
├── build/             # script que regenera las listas
├── popup/             # popup (toggle + contador)
└── icons/             # iconos
```

## Licencia

Licencia MIT.
