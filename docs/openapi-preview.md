# OpenAPI Preview (How-To)

## Local preview (static)
Open `docs/openapi-preview.html` in your browser. It will render `docs/openapi.yaml` via Swagger UI CDN.

## Alternative: local server
You can serve the `docs/` folder with any static server (e.g., `npx http-server docs -p 8080`) and open `http://localhost:8080/openapi-preview.html`.

## Editing workflow
- Update `docs/openapi.yaml` while implementing backend endpoints.
- Reload the preview page to see changes.

## Security note
Do not expose the preview publicly without access control. It may describe internal endpoints.
