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
3. Despliega. Las funciones estarán disponibles en `/api/ai/generate-text` y `/api/ai/generate-image`.

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
