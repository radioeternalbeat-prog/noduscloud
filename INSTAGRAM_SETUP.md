# Configuración de publicación directa en Instagram

La aplicación ya incluye el adaptador servidor para publicar imágenes y Reels mediante Instagram Graph API. La publicación se ejecuta únicamente en el servidor; nunca se expone el token al navegador.

## Requisitos de Meta/Instagram

- Cuenta profesional de Instagram (Business o Creator).
- Aplicación de Meta con los permisos de publicación correspondientes.
- Token de usuario de Instagram con `instagram_business_basic` y `instagram_business_content_publish` cuando se use Instagram Login, o los permisos equivalentes del flujo Facebook Login for Business.
- Identificador de la cuenta profesional de Instagram.
- Media alojada en una URL pública HTTPS para que Instagram pueda descargarla.

La API vigente usa el flujo de dos pasos: crear un contenedor en `/{IG_ID}/media` y publicarlo en `/{IG_ID}/media_publish`. Para Reels, la aplicación espera el procesamiento del contenedor antes de publicarlo.

## Variables de servidor

Configurar estas variables como secretos del proyecto, nunca en el frontend ni en el repositorio:

```text
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_USER_ID=...
PUBLIC_APP_URL=https://tu-dominio-publico.example
```

`PUBLIC_APP_URL` debe apuntar al dominio público desde el que Instagram pueda descargar los archivos almacenados.

## Límites relevantes

- Las imágenes deben ser JPEG y no superar 8 MB para el flujo de publicación.
- Los Reels admiten MP4/MOV, H.264 o HEVC, hasta 300 MB y entre 3 segundos y 15 minutos.
- Instagram limita el número de publicaciones API dentro de una ventana móvil de 24 horas.
- Los contenedores expiran después de 24 horas.

La configuración oficial puede cambiar; revisar siempre la documentación de Meta antes de pasar a producción:
https://developers.facebook.com/documentation/instagram-platform/content-publishing
