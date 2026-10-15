---
trigger: always_on
---

# Reglas del Proyecto Ocularis

## 1. Entorno de Ejecución Exclusivo en Docker
- A partir de esta directiva del usuario, **toda ejecución, construcción y visualización local se realiza exclusivamente mediante Docker**.
- No iniciar servidores de desarrollo locales directos con Node o Vite en la máquina anfitriona (`npm run dev` o `npx vite`).
- El ciclo de vida de la aplicación se gestiona mediante `docker compose`:
  - Construcción y arranque: `docker compose up -d --build`
  - Puerto de acceso: `http://localhost:8080/`
  - Visualización de logs: `docker compose logs -f`
  - Detención: `docker compose down`

## 2. Convenciones de Git
- Usuario local: `Jayzir Martinez`
- Email local: `jayzirslaider18@gmail.com`
- Rama principal: `main`
- Repositorio remoto: `https://github.com/JayzirTech/ocularis.git`