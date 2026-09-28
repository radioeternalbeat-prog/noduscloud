# Desplegar Nodus para usarlo desde cualquier dispositivo

## Opción recomendada: publicación desde Manus WebDev

Nodus es una aplicación full-stack con autenticación, base de datos, almacenamiento de archivos y procedimientos de servidor. Por eso, la opción recomendada es publicarla desde el proyecto WebDev, no subir únicamente la carpeta `client` a un hosting estático.

1. Abre el proyecto **biblioteca-contenido** en Manus/WebDev.
2. Verifica que el checkpoint más reciente incluya la identidad de Nodus y que el estado del proyecto sea correcto.
3. Usa la acción **Publish / Publicar** del proyecto.
4. Selecciona el entorno de producción y confirma la publicación.
5. Copia la URL pública generada. Esa URL funcionará desde Chrome, Safari, Android, iPhone, tablet y ordenador.
6. Abre la URL desde cada dispositivo e inicia sesión con la misma cuenta para ver el contenido sincronizado.
7. En el teléfono, usa **Añadir a pantalla de inicio** para convertir Nodus en un acceso rápido tipo aplicación.

> En esta sesión no hay una herramienta MCP de publicación directa; el checkpoint deja el proyecto preparado para que la publicación se haga desde la interfaz WebDev.

## Antes de publicar

- Confirma que la base de datos esté activa.
- Revisa las variables de entorno y secretos del proyecto; nunca los pongas en el frontend ni en GitHub.
- Si usarás Instagram, configura en producción `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` y `PUBLIC_APP_URL` mediante el gestor seguro de secretos.
- `PUBLIC_APP_URL` debe ser la URL HTTPS pública de producción para que Instagram pueda leer los archivos.
- Prueba inicio de sesión, subida de una foto, subida de un video, calendario, enlace privado y publicación antes de compartir la URL.

## Si prefieres GitHub + otro proveedor

Puedes guardar el código en un repositorio privado y desplegarlo en un proveedor compatible con Node.js, pero debes configurar manualmente:

- Runtime Node.js 22.
- Comando de build: `pnpm build`.
- Comando de inicio: `pnpm start`.
- `DATABASE_URL`, `JWT_SECRET`, las variables OAuth y las variables de almacenamiento.
- Base de datos MySQL/TiDB accesible desde producción.
- Almacenamiento S3 compatible.
- Dominio HTTPS público.

Para esta aplicación, un despliegue externo requiere más configuración que WebDev porque también debe conservar autenticación, base de datos, sesiones y almacenamiento de archivos.
