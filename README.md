# Taller de Cuentos Interactivo

Separación en HTML/CSS/JS y funciones de IA vía Vercel.

## Estructura
- `index.html` – UI principal
- `style.css` – estilos
- `main.js` – lógica de la app (front-end)
- `api/ai/generate-text.js` – función serverless para texto (Gemini)
- `api/ai/generate-image.js` – función serverless para imágenes (Imagen 3)

## Configuración en Vercel
1. Crea el proyecto en Vercel y sube este directorio.
2. En Variables de Entorno, añade:
   - `GOOGLE_API_KEY` – clave de Google AI Studio/Vertex AI (con acceso a Gemini/Imagen).
   - Opcional: `GOOGLE_IMAGE_MODEL` (por defecto `imagen-3.0`).
   - Opcional: `GOOGLE_IMAGE_AR` (ej. `1:1`, `16:9`).
   - Opcional: `IMAGE_DEV_PLACEHOLDER` = `true` para devolver un placeholder SVG si la API de imágenes falla (solo útil para pruebas).
3. Despliega. Las funciones estarán disponibles en `/api/ai/generate-text` y `/api/ai/generate-image`.

## Despliegue con GitHub + Vercel
Sigue estos pasos para que cada push/PR en GitHub se despliegue automáticamente en Vercel:

1) Requisitos
- Cuenta de GitHub con este repo (`main` como rama de producción).
- Cuenta en Vercel y la app de Vercel instalada en tu GitHub (se hace al importar el repo).
- Tu `GOOGLE_API_KEY` (Google AI Studio) con acceso a Gemini 1.5 e Imagen 3.

2) Importar el repo en Vercel
- En Vercel: New Project → Import Git Repository → elige este repo.
- Root Directory: `/` (raíz del proyecto).
- Build Command: deja vacío (no hay build, es estático + funciones serverless).
- Output Directory: deja vacío.
- Functions: ya están en `api/**` y el runtime Node 18 está fijado en `vercel.json`.

3) Variables de entorno
- En Project Settings → Environment Variables, añade `GOOGLE_API_KEY` para:
   - Production
   - Preview (para que funcione en PRs)
   - Opcional: Development
- Guarda y vuelve a desplegar si ya existía un deployment previo.

4) Flujo de despliegue
- Cada push a cualquier rama crea un Preview Deployment con su URL.
- Los merges/push a `main` actualizan el Production Deployment.

5) Comprobar
- Abre la URL del deployment y usa la app.
- Si ves errores 500 de las rutas `/api/ai/*`, revisa que `GOOGLE_API_KEY` esté configurada en el entorno correspondiente (Preview/Production) y que el modelo tenga acceso en tu cuenta.

6) Dominio (opcional)
- En Domains añade tu dominio y apunta los DNS según indique Vercel.

Notas
- No hay `package.json`; Vercel no instalará dependencias ni ejecutará build. Sirve `index.html`/`style.css`/`main.js` y expone `api/**` como funciones.
- Si más adelante añades herramientas de build (por ejemplo, Vite), actualiza Build/Output y añade el directorio de salida.

## Desarrollo local
- Instala Vercel CLI y ejecuta:

```powershell
npm i -g vercel; vercel login; vercel link; vercel env pull .env
vercel dev
```

Luego abre `http://localhost:3000`.

## Notas
- No expongas tu API key en el cliente. El front ya llama a las rutas `/api/ai/*`.
- Si quieres cambiar de modelo, edita `api/ai/generate-text.js` (const `model`).
 - Para imágenes, puedes ajustar `GOOGLE_IMAGE_MODEL` y `GOOGLE_IMAGE_AR` sin tocar código.

## Solución de problemas (502 en /api/ai/generate-image)
Si ves `generate-image no OK: Upstream image API error` en la consola:

1) Comprueba la API desde la UI
   - En el paso Portada, pulsa “Comprobar API”. Debe indicar `API OK · GOOGLE_API_KEY: sí`.
   - Si dice `no`, añade la variable en Vercel (Production/Preview) y vuelve a desplegar.

2) Revisa permisos/cuota del modelo
   - En Google AI Studio, confirma que tu clave tiene acceso al endpoint de imágenes (Imagen 3) en tu región.
   - Cambia temporalmente el modelo con `GOOGLE_IMAGE_MODEL=imagen-3.0` (o el vigente) y reintenta.

3) CORS o base URL
   - Si sirves la UI en otro dominio (p. ej., GitHub Pages), define `window.ENV_API_BASE` en `index.html` con tu dominio de Vercel.

4) Prueba con placeholder de desarrollo
   - Ajusta `IMAGE_DEV_PLACEHOLDER=true` para que la función devuelva una imagen SVG temporal y validar el flujo de extremo a extremo.

Si el problema persiste, mira la respuesta detallada en la consola (hemos mejorado los mensajes del front) y los logs de Vercel.

## GitHub Pages (UI) + Vercel (APIs)
Si sirves la interfaz en GitHub Pages y las funciones en Vercel, debes apuntar el front a la URL de Vercel:

1) En `index.html`, descomenta y pon tu dominio de Vercel:

   // window.ENV_API_BASE = 'https://tu-proyecto.vercel.app';

2) Alternativamente, deja esa línea comentada y edita en `main.js` el valor por defecto dentro de inferredApiBase para GitHub Pages.

3) Verifica que las funciones responden en:
   - https://tu-proyecto.vercel.app/api/ai/generate-text
   - https://tu-proyecto.vercel.app/api/ai/generate-image

Este repo ya añade CORS en las funciones (`Access-Control-Allow-Origin: *`) para que funcionen en orígenes distintos.
