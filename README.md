# 🔬 Ocularis — Experiencia Educativa Óptica

Herramienta visual interactiva diseñada para la consulta optométrica presencial. Permite al profesional de la salud visual explicar al paciente, de forma clara y cinematográfica, cómo funcionan condiciones como la **miopía** y el **astigmatismo**, y cómo actúan las lentes correctoras.

> **No es una herramienta de diagnóstico.** Ocularis ilustra principios ópticos con fines pedagógicos.

---

## 🏗️ Resumen Técnico

### Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| **Bundler / Dev Server** | Vite 6 | HMR ultrarrápido, build optimizado, zero-config |
| **Lenguaje** | Vanilla JavaScript (ES Modules) | Sin frameworks pesados, máximo rendimiento a 60 FPS |
| **Motor de Óptica** | HTML5 Canvas 2D | Trazado de rayos en tiempo real, partículas de refracción, efectos de glow |
| **Anatomía del Ojo** | SVG interactivo | Nitidez vectorial en pantallas 4K/Retina, hotspots interactivos |
| **Estilos** | CSS modular (Vanilla) | Design system médico premium con glassmorphism y modo oscuro |
| **Servidor de Producción** | Nginx Alpine | Imagen Docker de ~25 MB, compresión gzip, caché de assets |
| **Contenedorización** | Docker multi-stage | Build reproducible, despliegue inmediato en cualquier nube |

### Arquitectura de la Aplicación

```
SPA de lienzo único (sin rutas URL)
│
├── Máquina de Estados (state-machine.js)
│   Gobierna las transiciones entre escenas:
│   Splash → Macro-Ojo → Anatomía → Miopía/Astigmatismo → Simulador → Síntesis
│
├── Motor de Simulación Óptica (simulation/)
│   Trazado de rayos 2D, cálculo de refracción,
│   comportamiento de lentes divergentes y tóricas
│
├── Componentes Visuales (components/)
│   Ojo interactivo, explorador anatómico, slider de percepción,
│   HUD de controles para el profesional
│
└── Core (core/)
    Bus de eventos, detección de dispositivos, gestión de fullscreen
```

### Restricciones de Plataforma

- **Pantalla mínima:** 768px de ancho (tablets y escritorio).
- **Móviles bloqueados:** Los smartphones muestran una pantalla informativa indicando que la experiencia requiere una pantalla de mayor tamaño.
- **Fullscreen:** Se activa automáticamente al iniciar la experiencia mediante un botón de entrada (requisito de seguridad del navegador).

### Compatibilidad de Navegadores

- Chrome/Edge 90+
- Safari 15+ (macOS / iPadOS)
- Firefox 90+

---

## 🚀 Cómo Ejecutar el Proyecto

### Opción 1: Desarrollo Local (con Node.js)

**Requisitos:** Node.js 18+ y npm.

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd proyecto-experiencia-optica

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (con hot-reload)
npm run dev
```

La app estará disponible en `http://localhost:5173`.

---

### Opción 2: Docker (Desarrollo y Producción)

**Requisitos:** Docker y Docker Compose instalados.

#### Levantar con Docker Compose (recomendado)

```bash
# Construir la imagen y levantar el contenedor
docker compose up --build

# En segundo plano:
docker compose up --build -d
```

La app estará disponible en `http://localhost:8080`.

#### Construir y ejecutar manualmente

```bash
# Construir la imagen
docker build -t ocularis .

# Ejecutar el contenedor
docker run -p 8080:80 ocularis
```

#### Detener el contenedor

```bash
# Si usaste docker compose:
docker compose down

# Si usaste docker run, buscar el ID y detener:
docker ps
docker stop <container-id>
```

---

### Opción 3: Despliegue en la Nube

La imagen Docker generada es compatible con cualquier servicio de contenedores:

| Plataforma | Servicio Recomendado |
|---|---|
| **AWS** | App Runner, ECS Fargate, o Lightsail Containers |
| **Google Cloud** | Cloud Run |
| **Azure** | Container Apps |
| **Otros** | Render, Railway, DigitalOcean App Platform |

```bash
# Ejemplo: push a Amazon ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag ocularis:latest <account>.dkr.ecr.<region>.amazonaws.com/ocularis:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/ocularis:latest
```

---

## 📁 Estructura del Proyecto

```
├── index.html                      # Entrada HTML principal
├── package.json                    # Dependencias y scripts
├── vite.config.js                  # Configuración de Vite
├── Dockerfile                      # Build multi-stage (Node + Nginx)
├── docker-compose.yml              # Orquestación local con un comando
├── nginx.conf                      # Configuración de producción (gzip, caché, SPA)
├── .dockerignore                   # Exclusiones para builds rápidos
│
├── public/                         # Assets estáticos
│   └── assets/images/              # Imágenes del simulador de percepción
│
└── src/
    ├── main.js                     # Punto de entrada y orquestador
    ├── styles/                     # Design system CSS modular
    ├── core/                       # Máquina de estados, eventos, device guard
    ├── components/                 # UI: ojo, anatomía, HUD, simulador, mobile gate
    └── simulation/                 # Motor de óptica: ray tracer, lentes, condiciones
```

---

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.
