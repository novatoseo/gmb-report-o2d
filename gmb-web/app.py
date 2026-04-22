# -*- coding: utf-8 -*-
"""
Generador de Informes GMB - O2D (version web)
Aplicacion Flask que reutiliza la logica de gmb_report.py pero expone
un formulario web y devuelve el PDF como descarga.

Variables de entorno:
    APP_PASSWORD - contrasena compartida para acceder a la app
    SECRET_KEY   - clave para firmar sesiones de Flask
    PORT         - puerto (Render lo inyecta automaticamente)
"""

import io
import os
import datetime
import secrets

from flask import (
    Flask, render_template, request, send_file,
    session, redirect, url_for, flash, abort
)

from gmb_report import (
    build_pdf_to_buffer, slugify,
)

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
# Cookie de sesion segura en produccion (cuando llega por HTTPS)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
if os.environ.get("FLASK_ENV") != "development":
    app.config["SESSION_COOKIE_SECURE"] = True

# Contrasena: si no esta configurada, usa una por defecto DEBIL (solo para dev local)
APP_PASSWORD = os.environ.get("APP_PASSWORD", "o2d-dev-local")


# =============================================================================
# DECORADOR DE AUTENTICACION
# =============================================================================
def login_required(view_func):
    """Protege rutas: redirige a /login si no hay sesion valida."""
    def wrapper(*args, **kwargs):
        if not session.get("authenticated"):
            return redirect(url_for("login", next=request.path))
        return view_func(*args, **kwargs)
    wrapper.__name__ = view_func.__name__
    return wrapper


# =============================================================================
# RUTAS
# =============================================================================
@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("authenticated"):
        return redirect(url_for("index"))

    error = None
    if request.method == "POST":
        password = request.form.get("password", "").strip()
        if secrets.compare_digest(password, APP_PASSWORD):
            session.clear()
            session["authenticated"] = True
            session.permanent = True
            next_url = request.args.get("next") or url_for("index")
            # Evitar open redirect: solo permitir rutas relativas
            if not next_url.startswith("/"):
                next_url = url_for("index")
            return redirect(next_url)
        else:
            error = "Contrasena incorrecta"

    return render_template("login.html", error=error)


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/", methods=["GET"])
@login_required
def index():
    return render_template("form.html")


@app.route("/generate", methods=["POST"])
@login_required
def generate():
    try:
        data = parse_form_data(request.form)
    except ValueError as e:
        flash(f"Error en los datos: {e}", "error")
        return redirect(url_for("index"))

    # Generar PDF en memoria
    buffer = io.BytesIO()
    build_pdf_to_buffer(data, buffer)
    buffer.seek(0)

    # Nombre del archivo
    slug = slugify(data["business_name"])
    date_str = data["date"].strftime("%Y%m%d")
    filename = f"informe_gmb_{slug}_{date_str}.pdf"

    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


@app.route("/health")
def health():
    """Endpoint para que Render verifique que la app esta viva."""
    return {"status": "ok"}, 200


# =============================================================================
# PARSEO DE DATOS DEL FORMULARIO
# =============================================================================
def parse_form_data(form):
    """
    Convierte el request.form en el dict que espera build_pdf_to_buffer().
    Valida tipos y lanza ValueError con mensaje descriptivo si algo falla.
    """
    def req(key, label):
        val = form.get(key, "").strip()
        if not val:
            raise ValueError(f"'{label}' es obligatorio")
        return val

    def req_float(key, label, min_val=None, max_val=None):
        raw = req(key, label)
        try:
            val = float(raw.replace(",", "."))
        except ValueError:
            raise ValueError(f"'{label}' debe ser un numero")
        if min_val is not None and val < min_val:
            raise ValueError(f"'{label}' debe ser >= {min_val}")
        if max_val is not None and val > max_val:
            raise ValueError(f"'{label}' debe ser <= {max_val}")
        return val

    def req_int(key, label, min_val=None, max_val=None):
        raw = req(key, label)
        try:
            val = int(raw)
        except ValueError:
            raise ValueError(f"'{label}' debe ser un numero entero")
        if min_val is not None and val < min_val:
            raise ValueError(f"'{label}' debe ser >= {min_val}")
        if max_val is not None and val > max_val:
            raise ValueError(f"'{label}' debe ser <= {max_val}")
        return val

    # Bloque 1: datos del cliente
    business_name = req("business_name", "Nombre del negocio")
    address = req("address", "Direccion")
    rating = req_float("rating", "Puntuacion Google", 1.0, 5.0)
    reviews = req_int("reviews", "Numero de resenas", 0)
    category = req("category", "Categoria")
    consultant = req("consultant", "Nombre del consultor")

    # Bloque 2: metricas
    visibility = req_int("visibility", "Visibilidad global", 0, 100)
    avg_position = req_int("avg_position", "Posicion promedio", 1)

    # Bloque 3: keywords (arrays con mismo indice)
    kw_names = form.getlist("kw_name")
    kw_volumes = form.getlist("kw_volume")
    kw_positions = form.getlist("kw_position")
    # checkboxes: venimos como "on" si estan marcados, vacio si no
    # usamos un hidden con el indice para saber cuantas filas hay
    kw_indices = form.getlist("kw_index")

    if not kw_indices:
        raise ValueError("Debes introducir al menos una keyword")
    if len(kw_indices) > 20:
        raise ValueError("Maximo 20 keywords")

    keywords = []
    for i, idx in enumerate(kw_indices):
        if i >= len(kw_names):
            break
        name = (kw_names[i] or "").strip()
        volume = (kw_volumes[i] or "").strip()
        pos_raw = (kw_positions[i] or "").strip()

        # Si la fila esta totalmente vacia, la ignoramos silenciosamente
        if not name and not volume and not pos_raw:
            continue

        if not name:
            raise ValueError(f"Keyword {i + 1}: nombre obligatorio")
        if not volume:
            raise ValueError(f"Keyword {i + 1}: volumen obligatorio")
        if not pos_raw:
            raise ValueError(f"Keyword {i + 1}: posicion obligatoria")

        try:
            position = int(pos_raw)
        except ValueError:
            raise ValueError(f"Keyword {i + 1}: posicion debe ser un entero")
        if position < 1:
            raise ValueError(f"Keyword {i + 1}: posicion debe ser >= 1")

        # Local Pack: el checkbox usa name="kw_local_pack_{idx}"
        local_pack = form.get(f"kw_local_pack_{idx}") == "on"

        keywords.append({
            "name": name,
            "volume": volume,
            "position": position,
            "local_pack": local_pack,
        })

    if not keywords:
        raise ValueError("Debes introducir al menos una keyword valida")

    return {
        "business_name": business_name,
        "address": address,
        "rating": rating,
        "reviews": reviews,
        "category": category,
        "consultant": consultant,
        "visibility": visibility,
        "avg_position": avg_position,
        "keywords": keywords,
        "date": datetime.date.today(),
    }


# =============================================================================
# ENTRY POINT
# =============================================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
