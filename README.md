# 🚀 Plantilla Maestra: Google Apps Script + WSL

Este es mi estándar de ingeniería para proyectos de automatización y Data Science. Está diseñado para trabajar de forma profesional en **VS Code (WSL)**, con control de versiones en **GitHub** y despliegue automatizado hacia Google con **clasp**.

## 🛠️ Requisitos Previos (Solo una vez por PC)

Antes de iniciar, asegúrate de tener estas herramientas instaladas en tu terminal de WSL:

1. **Node.js y npm:** `sudo apt install nodejs npm`
2. **Clasp (Global):** `npm install -g @google/clasp`
3. **Login en Google:** `clasp login` (Sigue el link en el navegador).

---

## 🚀 Cómo iniciar un proyecto nuevo desde esta plantilla

### 1. En GitHub

1. Ve al repositorio de esta plantilla y haz clic en el botón verde **"Use this template"**.
2. Ponle nombre a tu nuevo proyecto (ej. `sistema-bitacoras-gas`).
3. Crea el repositorio.

### 2. En tu terminal de WSL

1. **Clona tu nuevo proyecto:**

   ```bash
   git clone [URL-DE-TU-NUEVO-REPO]
   cd [NOMBRE-DEL-PROYECTO]

### Instala las herramientas de limpieza (ESLint/Prettier)

npm install

### Vincula el código con Google Apps Script

clasp create --title "Nombre del Proyecto en Google" --rootDir ./src

-----

## 🔄 Flujo de Trabajo Diario

### 💻 Desarrollo

Abre el taller: code .

Escribe tu código siempre dentro de la carpeta /src.

Limpiar formato: Antes de guardar, corre npm run format para que el código se ordene solo.

### 📤 Sincronización con Google

Subir cambios: clasp push (Envía lo que tienes en VS Code a la nube).

Bajar cambios: clasp pull (Si editaste algo directamente en el navegador).

### 🛡️ Guardar en GitHub (Control de Versiones)

Haz esto cada vez que termines una función o un avance importante:

git add .
git commit -m "feat: descripción breve de lo que agregaste"
git push origin main

### 📁 Estructura del Proyecto

src/: Todo el código fuente (.gs y .html). Es lo único que sube a Google.

.gitignore: Evita que tus claves privadas se suban a internet.

package.json: Configuración de herramientas y scripts de limpieza.

.eslintrc.json: El "inspector" que evita errores de sintaxis.
