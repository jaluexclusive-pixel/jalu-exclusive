# Jalu Exclusive — versión Google Sheets

Esta versión usa Google Sheets + Google Apps Script como catálogo y registro de pedidos.

## Configuración ya realizada
- Apps Script Web App: configurada en `config.js`.
- Google Sheet: configurado en `config.js`.
- Catálogo: se lee desde `Productos`.
- Pedidos: se envían a `Pedidos`.

## WhatsApp
Edita `config.js` y reemplaza:
- `WHATSAPP_1`
- `WHATSAPP_2`

Usa Perú sin `+`, espacios ni guiones. Ejemplo: `519XXXXXXXX`.

## Administración
La pestaña `Productos` de Google Sheets es el panel administrativo inicial. Es el lugar recomendado para editar precios, stock, imágenes y visibilidad sin exponer un endpoint de escritura administrativo en el navegador.

## Publicación
Sube `index.html`, `admin.html`, `styles.css`, `app.js` y `config.js` a un hosting estático como GitHub Pages, Netlify o Vercel.
