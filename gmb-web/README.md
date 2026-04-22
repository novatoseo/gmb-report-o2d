# Generador de Informes GMB — O2D

Herramienta web para generar informes PDF de auditoría de Google Business Profile
con el branding de O2D Oxígeno Digital.

## Ejecutar en local

```bash
pip install -r requirements.txt
set APP_PASSWORD=mi-contrasena-local
python app.py
```

Luego abre http://localhost:5000 en el navegador.

## Desplegar en Render

1. Sube este repositorio a GitHub.
2. En Render.com, conecta el repo como Blueprint (detectará `render.yaml`).
3. Durante el deploy, Render te pedirá el valor de `APP_PASSWORD`. Ese es el
   password que compartes con tu equipo.
4. En ~3 minutos tendrás una URL pública tipo
   `https://gmb-report-o2d.onrender.com`.

## Cambiar la contraseña

En el panel de Render → el servicio → **Environment** → edita `APP_PASSWORD`
y pulsa "Save Changes". El servicio se redeplega solo en ~1 minuto.

## Stack

- Flask 3 + Gunicorn
- ReportLab (generación de PDF)
- Autenticación por contraseña única compartida
- Sin base de datos, sin almacenamiento persistente
