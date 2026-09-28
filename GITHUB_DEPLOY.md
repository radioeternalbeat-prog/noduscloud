# Nodus en GitHub y despliegue

El repositorio contiene el código fuente de Nodus y una acción de GitHub que ejecuta instalación reproducible, TypeScript, pruebas y build en cada push o pull request hacia `main`.

## Qué no se sube

- Secretos y archivos `.env`.
- `node_modules`, `.pnpm-store` y artefactos `dist/`.
- Logs, cachés, cobertura y archivos internos de WebDev.

## Flujo recomendado

1. Trabajar en una rama de funcionalidad.
2. Abrir un pull request hacia `main`.
3. Esperar a que `Nodus CI` termine correctamente.
4. Fusionar el pull request.
5. Publicar desde Manus/WebDev o desplegar el runtime Node.js con los secretos configurados.

## Variables sensibles

Configura en producción, nunca dentro del código:

```text
DATABASE_URL
JWT_SECRET
VITE_APP_ID
OAUTH_SERVER_URL
VITE_OAUTH_PORTAL_URL
INSTAGRAM_ACCESS_TOKEN
INSTAGRAM_USER_ID
PUBLIC_APP_URL
```

Para Instagram, `PUBLIC_APP_URL` debe ser la URL HTTPS pública final para que Meta pueda descargar los medios.
