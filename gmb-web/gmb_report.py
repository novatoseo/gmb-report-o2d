# -*- coding: utf-8 -*-
"""
Generador de Informes GMB - O2D Oxigeno Digital
Herramienta CLI para generar informes PDF de auditoria de Google Business Profile.

Uso:
    python gmb_report.py

Requisitos:
    pip install reportlab
"""

import datetime
import unicodedata
import re
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Flowable, HRFlowable
)

# =============================================================================
# CONSTANTES DE MARCA O2D
# =============================================================================
COLOR_DARK_BLUE = colors.HexColor("#16354a")
COLOR_TEAL = colors.HexColor("#00C4CC")
COLOR_PURPLE = colors.HexColor("#797EF6")
COLOR_GREEN = colors.HexColor("#27AE60")
COLOR_ORANGE = colors.HexColor("#E67E22")
COLOR_RED = colors.HexColor("#E74C3C")
COLOR_LIGHT_BG = colors.HexColor("#F4F6FA")
COLOR_GREY = colors.HexColor("#6B7280")
COLOR_LIGHT_GREY = colors.HexColor("#D1D5DB")
COLOR_WHITE = colors.white

# Dimensiones A4 con margenes de 18mm
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 18 * mm
USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN  # ~493.23 puntos

# =============================================================================
# UTILIDADES DE TEXTO
# =============================================================================
TILDE_MAP = {
    "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u",
    "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U",
    "ñ": "n", "Ñ": "N",
    "ü": "u", "Ü": "U",
    "à": "a", "è": "e", "ì": "i", "ò": "o", "ù": "u",
    "â": "a", "ê": "e", "î": "i", "ô": "o", "û": "u",
    "ç": "c", "Ç": "C",
    "¿": "", "¡": "",
    "–": "-", "—": "-", "’": "'", "‘": "'", "“": '"', "”": '"',
    "…": "...", "•": "-",
}


def _to_ascii(text):
    """Sustituye tildes/caracteres especiales por equivalentes ASCII."""
    if text is None:
        return ""
    s = str(text)
    for orig, repl in TILDE_MAP.items():
        s = s.replace(orig, repl)
    # Normalizar cualquier caracter unicode restante (ej: emojis)
    s = unicodedata.normalize("NFKD", s)
    s = s.encode("ascii", "ignore").decode("ascii")
    return s


def clean(text):
    """
    Limpia texto para uso seguro dentro de Paragraph (reportlab parsea XML).
    - Sustituye tildes y caracteres especiales.
    - Escapa XML (&, <, >) para evitar que reportlab los interprete como tags.
    """
    s = _to_ascii(text)
    # Escape XML: & primero para no romper las siguientes sustituciones
    s = s.replace("&", "&amp;")
    s = s.replace("<", "&lt;")
    s = s.replace(">", "&gt;")
    return s


def clean_plain(text):
    """
    Limpia texto para uso con canvas.drawString/drawCentredString.
    NO escapa XML porque drawString no parsea tags: muestra el texto literal.
    Si se escapase, "&" aparece como "&amp;" en el PDF.
    """
    return _to_ascii(text)


def slugify(text):
    """
    Convierte un nombre en un slug seguro para nombres de archivo.
    Elimina caracteres invalidos de sistemas de archivos y tildes.
    """
    if not text:
        return "informe"
    # Normalizar y eliminar tildes
    s = unicodedata.normalize("NFKD", str(text))
    s = s.encode("ascii", "ignore").decode("ascii")
    s = s.lower()
    # Eliminar caracteres invalidos de filesystem
    invalid_chars = r'[/\\:\*\?"<>\|]'
    s = re.sub(invalid_chars, "", s)
    # Sustituir cualquier cosa que no sea alfanumerico por guion
    s = re.sub(r"[^a-z0-9]+", "-", s)
    # Eliminar guiones al inicio/fin y guiones duplicados
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "informe"


# =============================================================================
# VALIDACION DE INPUT
# =============================================================================
def ask_text(prompt, allow_empty=False):
    """Pide un texto al usuario, validando que no este vacio."""
    while True:
        try:
            value = input(prompt).strip()
        except EOFError:
            print("\nEntrada cancelada.")
            sys.exit(1)
        if value or allow_empty:
            return value
        print("  [!] Campo obligatorio, intentalo de nuevo.")


def ask_float(prompt, min_val=None, max_val=None):
    """Pide un numero decimal al usuario con validacion de rango."""
    while True:
        raw = ask_text(prompt)
        try:
            value = float(raw.replace(",", "."))
        except ValueError:
            print("  [!] Introduce un numero valido (ej: 4.5).")
            continue
        if min_val is not None and value < min_val:
            print(f"  [!] El valor debe ser >= {min_val}.")
            continue
        if max_val is not None and value > max_val:
            print(f"  [!] El valor debe ser <= {max_val}.")
            continue
        return value


def ask_int(prompt, min_val=None, max_val=None):
    """Pide un entero al usuario con validacion de rango."""
    while True:
        raw = ask_text(prompt)
        try:
            value = int(raw)
        except ValueError:
            print("  [!] Introduce un numero entero valido.")
            continue
        if min_val is not None and value < min_val:
            print(f"  [!] El valor debe ser >= {min_val}.")
            continue
        if max_val is not None and value > max_val:
            print(f"  [!] El valor debe ser <= {max_val}.")
            continue
        return value


def ask_yes_no(prompt):
    """Pide una respuesta s/n al usuario."""
    while True:
        raw = ask_text(prompt).lower()
        if raw in ("s", "si", "sí", "y", "yes"):
            return True
        if raw in ("n", "no"):
            return False
        print("  [!] Responde 's' para si o 'n' para no.")


# =============================================================================
# RECOLECCION DE DATOS
# =============================================================================
def collect_data():
    """Recoge todos los datos del informe desde la terminal."""
    print("=" * 60)
    print("   Generador de Informes GMB - O2D")
    print("=" * 60)

    # Bloque 1: datos del cliente
    print("\n[Datos del cliente]")
    business_name = ask_text("Nombre del negocio: ")
    address = ask_text("Direccion completa: ")
    rating = ask_float("Puntuacion Google (1.0-5.0, ej: 4.7): ", 1.0, 5.0)
    reviews = ask_int("Numero de resenas: ", 0)
    category = ask_text("Categoria principal: ")
    consultant = ask_text("Tu nombre (consultor): ")

    # Bloque 2: metricas del perfil
    print("\n[Metricas del perfil]")
    visibility = ask_int("Visibilidad global (%): ", 0, 100)
    avg_position = ask_int("Posicion promedio: ", 1)

    # Bloque 3: keywords
    print("\n[Keywords]")
    kw_count = ask_int("Cuantas keywords vas a introducir? (1-20): ", 1, 20)

    keywords = []
    for i in range(kw_count):
        print(f"\nKeyword {i + 1}:")
        kw_name = ask_text("  Nombre: ")
        kw_volume = ask_text("  Volumen mensual (ej: ~250 o <15): ")
        kw_position = ask_int("  Posicion actual: ", 1)
        kw_local_pack = ask_yes_no("  Aparece en Local Pack? (s/n): ")
        keywords.append({
            "name": kw_name,
            "volume": kw_volume,
            "position": kw_position,
            "local_pack": kw_local_pack,
        })

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
# LOGICA DE NEGOCIO (colores y clasificacion)
# =============================================================================
def position_color(pos):
    """Color segun posicion: verde 1-5, naranja 6-15, rojo 16+."""
    if pos <= 5:
        return COLOR_GREEN
    if pos <= 15:
        return COLOR_ORANGE
    return COLOR_RED


def visibility_color(vis):
    """Color segun visibilidad global: verde >=60, naranja 30-59, rojo <30."""
    if vis >= 60:
        return COLOR_GREEN
    if vis >= 30:
        return COLOR_ORANGE
    return COLOR_RED


def position_label(pos):
    """Etiqueta de valoracion segun posicion."""
    if pos <= 5:
        return ("Optimo", COLOR_GREEN)
    if pos <= 15:
        return ("Mejorable", COLOR_ORANGE)
    return ("Critico", COLOR_RED)


def compute_stats(data):
    """Calcula estadisticas derivadas de los datos introducidos."""
    kws = data["keywords"]
    top3 = [k for k in kws if k["position"] <= 3]
    top10 = [k for k in kws if k["position"] <= 10]
    beyond20 = [k for k in kws if k["position"] > 20]
    beyond15 = [k for k in kws if k["position"] > 15]
    local_pack_kws = [k for k in kws if k["local_pack"]]

    return {
        "top3": top3,
        "top10": top10,
        "beyond20": beyond20,
        "beyond15": beyond15,
        "local_pack": local_pack_kws,
        "total": len(kws),
    }


# =============================================================================
# FLOWABLES PERSONALIZADOS
# =============================================================================
class HeaderBanner(Flowable):
    """Cabecera del informe: fondo azul oscuro + franja teal superior."""
    def __init__(self, business_name, address, date_str, width, height=95):
        Flowable.__init__(self)
        self.business_name = clean_plain(business_name)
        self.address = clean_plain(address)
        self.date_str = clean_plain(date_str)
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        c.saveState()
        # Fondo azul oscuro
        c.setFillColor(COLOR_DARK_BLUE)
        c.rect(0, 0, self.width, self.height, fill=1, stroke=0)
        # Franja superior teal de 4pt
        c.setFillColor(COLOR_TEAL)
        c.rect(0, self.height - 4, self.width, 4, fill=1, stroke=0)
        # Titulo principal
        c.setFillColor(COLOR_WHITE)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(20, self.height - 32, "Informe de Perfil de Google Business")
        # Nombre del negocio en teal
        c.setFillColor(COLOR_TEAL)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(20, self.height - 52, self.business_name)
        # Direccion + fecha en gris claro
        c.setFillColor(colors.HexColor("#C5D2E0"))
        c.setFont("Helvetica", 9)
        c.drawString(20, self.height - 68, self.address)
        c.drawString(20, self.height - 82, f"Fecha del informe: {self.date_str}")
        c.restoreState()


class CTABanner(Flowable):
    """Banner final con datos de la agencia y firma del consultor."""
    def __init__(self, consultant, width, height=70):
        Flowable.__init__(self)
        self.consultant = clean_plain(consultant)
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(COLOR_DARK_BLUE)
        c.rect(0, 0, self.width, self.height, fill=1, stroke=0)
        c.setFillColor(COLOR_TEAL)
        c.rect(0, self.height - 4, self.width, 4, fill=1, stroke=0)
        c.setFillColor(COLOR_WHITE)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(
            self.width / 2, self.height - 28,
            "Elaborado por O2D - Oxigeno Digital"
        )
        c.setFillColor(colors.HexColor("#C5D2E0"))
        c.setFont("Helvetica", 9)
        c.drawCentredString(
            self.width / 2, self.height - 44,
            "o2d.es  |  Salamanca, Espana"
        )
        c.setFillColor(COLOR_TEAL)
        c.setFont("Helvetica-Oblique", 9)
        c.drawCentredString(
            self.width / 2, self.height - 60,
            f"Consultor: {self.consultant}"
        )
        c.restoreState()


class KPICards(Flowable):
    """Grid de 4 KPI cards en fila horizontal."""
    def __init__(self, cards, width, height=85):
        Flowable.__init__(self)
        self.cards = cards  # lista de (label, value, color)
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        c.saveState()
        n = len(self.cards)
        gap = 10
        card_w = (self.width - gap * (n - 1)) / n

        for i, (label, value, color) in enumerate(self.cards):
            x = i * (card_w + gap)
            # Fondo de la card
            c.setFillColor(COLOR_LIGHT_BG)
            c.rect(x, 0, card_w, self.height, fill=1, stroke=0)
            # Borde izquierdo de color (4pt)
            c.setFillColor(color)
            c.rect(x, 0, 4, self.height, fill=1, stroke=0)
            # Valor grande
            c.setFillColor(color)
            c.setFont("Helvetica-Bold", 26)
            c.drawString(x + 14, self.height - 40, clean_plain(value))
            # Etiqueta
            c.setFillColor(COLOR_DARK_BLUE)
            c.setFont("Helvetica-Bold", 9)
            # Split de etiquetas largas en 2 lineas
            label_clean = clean_plain(label)
            words = label_clean.split(" ")
            if len(words) > 2:
                mid = len(words) // 2
                line1 = " ".join(words[:mid])
                line2 = " ".join(words[mid:])
                c.drawString(x + 14, self.height - 58, line1)
                c.drawString(x + 14, self.height - 70, line2)
            else:
                c.drawString(x + 14, self.height - 62, label_clean)
        c.restoreState()


class InsightBlock(Flowable):
    """Bloque de insight con borde izquierdo de color."""
    def __init__(self, title, text, color, width):
        Flowable.__init__(self)
        self.title = clean_plain(title)  # va a drawString
        self.text = clean(text)  # va a Paragraph
        self.color = color
        self.width = width
        # Altura calculada en wrap()
        self._height = 0

    def wrap(self, avail_width, avail_height):
        # Estimacion de altura: titulo (16) + padding + texto envuelto
        # Usamos Paragraph para medir el texto real
        styles = getSampleStyleSheet()
        body_style = ParagraphStyle(
            "insight_body", parent=styles["BodyText"],
            fontName="Helvetica", fontSize=9.5, leading=13,
            textColor=COLOR_DARK_BLUE
        )
        self._para = Paragraph(self.text, body_style)
        # El texto ocupa el ancho menos el borde (8) y padding (20)
        inner_w = self.width - 28
        _, para_h = self._para.wrap(inner_w, avail_height)
        self._para_h = para_h
        # Titulo (14) + padding superior (12) + texto + padding inferior (12)
        self._height = 12 + 14 + 6 + para_h + 12
        return self.width, self._height

    def draw(self):
        c = self.canv
        c.saveState()
        h = self._height
        # Fondo suave
        c.setFillColor(COLOR_LIGHT_BG)
        c.rect(0, 0, self.width, h, fill=1, stroke=0)
        # Borde izquierdo de color (6pt)
        c.setFillColor(self.color)
        c.rect(0, 0, 6, h, fill=1, stroke=0)
        # Titulo
        c.setFillColor(self.color)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(18, h - 20, self.title)
        # Texto (renderizado con Paragraph)
        self._para.drawOn(c, 18, h - 20 - 6 - self._para_h)
        c.restoreState()


class RecommendationCard(Flowable):
    """Card de recomendacion con numero grande + titulo + descripcion."""
    def __init__(self, number, title, description, width):
        Flowable.__init__(self)
        self.number = str(number)
        self.title = clean_plain(title)  # va a drawString
        self.description = clean(description)  # va a Paragraph
        self.width = width
        self._height = 0

    def wrap(self, avail_width, avail_height):
        styles = getSampleStyleSheet()
        desc_style = ParagraphStyle(
            "rec_desc", parent=styles["BodyText"],
            fontName="Helvetica", fontSize=9, leading=12,
            textColor=COLOR_DARK_BLUE
        )
        self._para = Paragraph(self.description, desc_style)
        # Ancho interior: total - numero (40) - padding
        inner_w = self.width - 55
        _, para_h = self._para.wrap(inner_w, avail_height)
        self._para_h = para_h
        # Altura: padding (10) + titulo (13) + spacer (4) + desc + padding (12)
        self._height = max(10 + 13 + 4 + para_h + 12, 55)
        return self.width, self._height

    def draw(self):
        c = self.canv
        c.saveState()
        h = self._height
        # Fondo suave
        c.setFillColor(COLOR_LIGHT_BG)
        c.rect(0, 0, self.width, h, fill=1, stroke=0)
        # Numero grande teal a la izquierda
        c.setFillColor(COLOR_TEAL)
        c.setFont("Helvetica-Bold", 26)
        c.drawString(12, h - 28, self.number)
        # Titulo
        c.setFillColor(COLOR_DARK_BLUE)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(50, h - 22, self.title)
        # Descripcion
        self._para.drawOn(c, 50, h - 22 - 4 - self._para_h)
        c.restoreState()


# =============================================================================
# GENERACION DE INSIGHTS
# =============================================================================
def generate_insights(data, stats):
    """
    Genera entre 3 y 5 insights segun los datos introducidos.
    Cada insight es una tupla (titulo, texto, color).
    """
    insights = []
    kws = data["keywords"]

    # Insight 1: Top 3 (positivo)
    if stats["top3"]:
        names = ", ".join([f'"{k["name"]}"' for k in stats["top3"][:3]])
        insights.append((
            "Puntos fuertes identificados",
            f"El perfil ya posiciona en el Top 3 para {len(stats['top3'])} "
            f"palabra(s) clave: {names}. Estas keywords estan generando "
            f"visibilidad maxima y deben protegerse frente a competidores.",
            COLOR_GREEN,
        ))
    elif stats["top10"]:
        names = ", ".join([f'"{k["name"]}"' for k in stats["top10"][:3]])
        insights.append((
            "Keywords cercanas al Top 3",
            f"Hay {len(stats['top10'])} keyword(s) en Top 10 que pueden "
            f"escalar al Top 3 con optimizacion dirigida: {names}.",
            COLOR_ORANGE,
        ))
    else:
        insights.append((
            "Sin keywords en Top 10",
            "Ninguna de las keywords analizadas posiciona actualmente en "
            "el Top 10. La ficha necesita trabajo de optimizacion base antes "
            "de competir por terminos principales.",
            COLOR_RED,
        ))

    # Insight 2: Visibilidad baja
    if data["visibility"] < 40:
        insights.append((
            "Visibilidad global por debajo del umbral",
            f"La visibilidad del {data['visibility']}% indica que el perfil "
            f"aparece en pocas busquedas relativas a su categoria. Es prioritario "
            f"revisar categorias secundarias, descripcion, atributos y "
            f"coherencia NAP (nombre, direccion, telefono) en citations locales.",
            COLOR_RED,
        ))
    elif data["visibility"] < 60:
        insights.append((
            "Visibilidad mejorable",
            f"Con un {data['visibility']}% de visibilidad global, el perfil "
            f"tiene margen claro de mejora. Reforzar resenas recientes, "
            f"publicaciones semanales y Q&A puede elevar la visibilidad "
            f"en el Local Pack.",
            COLOR_ORANGE,
        ))
    else:
        insights.append((
            "Visibilidad global solida",
            f"El {data['visibility']}% de visibilidad demuestra que el perfil "
            f"esta bien posicionado dentro de su area de servicio. El foco "
            f"debe estar en defender esa posicion y capturar nuevos terminos "
            f"de cola larga.",
            COLOR_GREEN,
        ))

    # Insight 3: Local Pack
    if stats["local_pack"]:
        n = len(stats["local_pack"])
        insights.append((
            "Presencia en Local Pack",
            f"El negocio aparece en el pack de mapas para {n} keyword(s). "
            f"Esta es la ubicacion de mayor CTR en resultados locales y debe "
            f"consolidarse mediante senales de proximidad, resenas con "
            f"palabras clave y publicaciones geolocalizadas.",
            COLOR_GREEN,
        ))
    else:
        insights.append((
            "Sin apariciones en Local Pack",
            "El perfil no aparece en el pack de mapas para ninguna de las "
            "keywords analizadas. Este es el canal de mayor CTR en busquedas "
            "locales: priorizar optimizacion de categorias, resenas con "
            "keywords y densidad de publicaciones.",
            COLOR_RED,
        ))

    # Insight 4: Keywords criticas (>15)
    if stats["beyond15"]:
        n = len(stats["beyond15"])
        names = ", ".join([f'"{k["name"]}"' for k in stats["beyond15"][:3]])
        extra = "" if n <= 3 else f" (y {n - 3} mas)"
        insights.append((
            "Keywords con posicion critica",
            f"{n} keyword(s) estan mas alla de la posicion 15 y generan "
            f"trafico residual: {names}{extra}. Se recomienda decidir entre "
            f"optimizar agresivamente o descartarlas si no son estrategicas.",
            COLOR_RED,
        ))

    # Insight 5 (opcional): Reviews y rating
    if data["reviews"] < 20:
        insights.append((
            "Volumen de resenas bajo",
            f"Con solo {data['reviews']} resenas ({data['rating']}/5.0), el "
            f"perfil carece de senales de confianza suficientes para competir "
            f"en busquedas de alta intencion. Implementar un flujo automatizado "
            f"de solicitud de resenas post-servicio es prioritario.",
            COLOR_ORANGE,
        ))

    # Limitar a maximo 5
    return insights[:5]


def generate_summary_paragraph(data, stats):
    """Genera el parrafo de resumen ejecutivo auto-generado."""
    vis = data["visibility"]
    total = stats["total"]
    n_top3 = len(stats["top3"])
    n_top10 = len(stats["top10"])
    n_critical = len(stats["beyond15"])

    if vis >= 60 and n_top3 >= max(1, total // 3):
        state = "una posicion competitiva consolidada"
    elif vis >= 40 or n_top10 >= max(1, total // 3):
        state = "una base solida con margen claro de crecimiento"
    elif vis >= 20:
        state = "un posicionamiento irregular con areas criticas"
    else:
        state = "un posicionamiento debil que requiere intervencion inmediata"

    text = (
        f"El perfil de {data['business_name']} muestra {state} en su "
        f"categoria ({data['category']}). Sobre {total} palabras clave "
        f"analizadas, {n_top10} aparecen en Top 10 y {n_top3} en Top 3. "
        f"La visibilidad global del {vis}% y la posicion promedio "
        f"{data['avg_position']} marcan el punto de partida. "
    )
    if n_critical > 0:
        text += (
            f"Se detectan {n_critical} keyword(s) fuera del Top 15 que "
            f"requieren atencion prioritaria. "
        )
    text += (
        "A continuacion se detallan las keywords, conclusiones y el plan "
        "de accion recomendado."
    )
    return text


# =============================================================================
# CONSTRUCCION DEL PDF
# =============================================================================
def build_pdf(data, output_target):
    """
    Construye el PDF completo.
    output_target puede ser:
      - Un string: ruta de archivo en disco
      - Un objeto file-like con write() (ej: io.BytesIO): se escribe en memoria
    """
    stats = compute_stats(data)

    # Document
    doc = SimpleDocTemplate(
        output_target,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN + 8,
        title=clean_plain(f"Informe GMB - {data['business_name']}"),
        author="O2D - Oxigeno Digital",
    )

    # Estilos
    styles = getSampleStyleSheet()
    body_style = ParagraphStyle(
        "body", parent=styles["BodyText"],
        fontName="Helvetica", fontSize=10, leading=14,
        textColor=COLOR_DARK_BLUE, alignment=TA_JUSTIFY,
    )
    section_title_style = ParagraphStyle(
        "sec_title", parent=styles["Heading2"],
        fontName="Helvetica-Bold", fontSize=14, leading=18,
        textColor=COLOR_DARK_BLUE, spaceAfter=4, spaceBefore=0,
    )
    table_header_style = ParagraphStyle(
        "th", parent=styles["BodyText"],
        fontName="Helvetica-Bold", fontSize=9.5, leading=12,
        textColor=COLOR_WHITE, alignment=TA_CENTER,
    )
    table_cell_style = ParagraphStyle(
        "td", parent=styles["BodyText"],
        fontName="Helvetica", fontSize=9, leading=12,
        textColor=COLOR_DARK_BLUE, alignment=TA_LEFT,
    )
    table_cell_center_style = ParagraphStyle(
        "td_c", parent=table_cell_style, alignment=TA_CENTER,
    )

    story = []

    # --- Header ---
    date_str = data["date"].strftime("%d/%m/%Y")
    story.append(HeaderBanner(
        data["business_name"], data["address"], date_str, USABLE_WIDTH
    ))
    story.append(Spacer(1, 14))

    # Barra de meta-info: categoria, puntuacion, resenas
    meta_text = (
        f"<b>Categoria:</b> {clean(data['category'])}  "
        f"&nbsp;|&nbsp;  "
        f"<b>Puntuacion:</b> {data['rating']:.1f} / 5.0  "
        f"&nbsp;|&nbsp;  "
        f"<b>Resenas:</b> {data['reviews']}"
    )
    meta_style = ParagraphStyle(
        "meta", parent=body_style, fontSize=9.5, textColor=COLOR_GREY,
        alignment=TA_LEFT,
    )
    story.append(Paragraph(meta_text, meta_style))
    story.append(Spacer(1, 16))

    # --- Seccion 1: Resumen Ejecutivo ---
    story.append(Paragraph(clean("1. Resumen Ejecutivo"), section_title_style))
    story.append(HRFlowable(
        width="100%", thickness=1.5, color=COLOR_PURPLE,
        spaceBefore=2, spaceAfter=0,
    ))
    story.append(Spacer(1, 10))

    # KPI cards
    kpi_cards = [
        ("Visibilidad Global",
         f"{data['visibility']}%",
         visibility_color(data['visibility'])),
        ("Posicion Promedio",
         str(data['avg_position']),
         position_color(data['avg_position'])),
        ("Keywords Top 10",
         f"{len(stats['top10'])}/{stats['total']}",
         COLOR_GREEN if len(stats['top10']) >= stats['total'] / 2
         else COLOR_ORANGE if len(stats['top10']) > 0 else COLOR_RED),
        ("Keywords Top 3",
         f"{len(stats['top3'])}/{stats['total']}",
         COLOR_GREEN if len(stats['top3']) > 0
         else COLOR_ORANGE if len(stats['top10']) > 0 else COLOR_RED),
    ]
    story.append(KPICards(kpi_cards, USABLE_WIDTH))
    story.append(Spacer(1, 14))

    # Parrafo resumen
    summary = generate_summary_paragraph(data, stats)
    story.append(Paragraph(clean(summary), body_style))
    story.append(Spacer(1, 18))

    # --- Seccion 2: Keywords ---
    story.append(Paragraph(
        clean("2. Analisis de Palabras Clave"), section_title_style
    ))
    story.append(HRFlowable(
        width="100%", thickness=1.5, color=COLOR_PURPLE,
        spaceBefore=2, spaceAfter=0,
    ))
    story.append(Spacer(1, 10))

    # Cabecera de tabla
    kw_header = [
        Paragraph(clean("Palabra Clave"), table_header_style),
        Paragraph(clean("Vol./mes"), table_header_style),
        Paragraph(clean("Posicion"), table_header_style),
        Paragraph(clean("Local Pack"), table_header_style),
        Paragraph(clean("Valoracion"), table_header_style),
    ]
    kw_rows = [kw_header]

    # Columnas: Keyword | Volumen | Posicion | Local Pack | Valoracion
    # Total = 493.23. Reparto: 180 + 70 + 70 + 75 + 98.23 = 493.23
    col_widths = [180, 70, 70, 75, 98.23]
    # Verificacion defensiva
    assert sum(col_widths) <= USABLE_WIDTH + 0.01, \
        f"colWidths suman {sum(col_widths)} > {USABLE_WIDTH}"

    # Estilos especializados por celda
    def pos_cell_style(color):
        return ParagraphStyle(
            f"pos_{id(color)}", parent=table_cell_center_style,
            fontName="Helvetica-Bold", textColor=color,
        )

    def label_cell_style(color):
        return ParagraphStyle(
            f"lab_{id(color)}", parent=table_cell_center_style,
            fontName="Helvetica-Bold", textColor=color, fontSize=8.5,
        )

    for kw in data["keywords"]:
        pos = kw["position"]
        pcolor = position_color(pos)
        label, lcolor = position_label(pos)
        lp_color = COLOR_GREEN if kw["local_pack"] else COLOR_GREY
        lp_style = ParagraphStyle(
            f"lp_{id(lp_color)}", parent=table_cell_center_style,
            fontName="Helvetica-Bold", textColor=lp_color,
        )
        kw_rows.append([
            Paragraph(clean(kw["name"]) or "&nbsp;", table_cell_style),
            Paragraph(clean(kw["volume"]) or "&nbsp;", table_cell_center_style),
            Paragraph(str(pos), pos_cell_style(pcolor)),
            Paragraph("Si" if kw["local_pack"] else "No", lp_style),
            Paragraph(label, label_cell_style(lcolor)),
        ])

    kw_table = Table(kw_rows, colWidths=col_widths, repeatRows=1)
    kw_table_style = TableStyle([
        # Cabecera
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_DARK_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), COLOR_WHITE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        # Bordes finos
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, COLOR_WHITE),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, COLOR_LIGHT_GREY),
    ])
    # Filas alternadas (blanco / gris claro) para las filas de datos
    for i in range(1, len(kw_rows)):
        bg = COLOR_WHITE if i % 2 == 1 else COLOR_LIGHT_BG
        kw_table_style.add("BACKGROUND", (0, i), (-1, i), bg)
    kw_table.setStyle(kw_table_style)
    story.append(kw_table)
    story.append(Spacer(1, 20))

    # --- Seccion 3: Conclusiones Clave (Insights) ---
    story.append(Paragraph(clean("3. Conclusiones Clave"), section_title_style))
    story.append(HRFlowable(
        width="100%", thickness=1.5, color=COLOR_PURPLE,
        spaceBefore=2, spaceAfter=0,
    ))
    story.append(Spacer(1, 10))

    insights = generate_insights(data, stats)
    for title, text, color in insights:
        story.append(InsightBlock(title, text, color, USABLE_WIDTH))
        story.append(Spacer(1, 8))
    story.append(Spacer(1, 12))

    # --- Seccion 4: Plan de Accion ---
    story.append(Paragraph(clean("4. Plan de Accion"), section_title_style))
    story.append(HRFlowable(
        width="100%", thickness=1.5, color=COLOR_PURPLE,
        spaceBefore=2, spaceAfter=0,
    ))
    story.append(Spacer(1, 10))

    recommendations = [
        ("Completar ficha al 100%",
         "Asegurar que categorias, atributos, horarios, telefono, web y "
         "descripcion esten completos. Google premia fichas con senales "
         "completas con mayor visibilidad."),
        ("Flujo de resenas continuo",
         "Implementar peticion automatica de resenas post-servicio via QR, "
         "email o SMS. Objetivo: minimo 5 resenas nuevas al mes, respondidas "
         "en menos de 48h."),
        ("Publicaciones semanales",
         "Publicar una novedad, oferta o evento cada semana. Las "
         "publicaciones activas son una senal directa de relevancia para el "
         "algoritmo de GMB."),
        ("Fotos geoetiquetadas",
         "Subir fotos reales del local, producto o servicio con "
         "geolocalizacion. Frecuencia minima: 4 fotos/mes. Evitar fotos de "
         "stock o genericas."),
        ("Coherencia NAP en citations",
         "Auditar y unificar nombre, direccion y telefono en los principales "
         "directorios locales. Cualquier discrepancia penaliza la autoridad "
         "local del perfil."),
        ("Q&A y atributos",
         "Precargar las 5-10 preguntas frecuentes del negocio en la seccion "
         "Q&A y activar todos los atributos aplicables (accesibilidad, "
         "metodos de pago, servicios, etc.)."),
    ]

    # Grid 2 columnas
    rec_col_width = (USABLE_WIDTH - 12) / 2  # 12pt de gap
    assert rec_col_width * 2 + 12 <= USABLE_WIDTH + 0.01

    rec_rows = []
    for i in range(0, len(recommendations), 2):
        left = RecommendationCard(
            i + 1, recommendations[i][0], recommendations[i][1], rec_col_width
        )
        if i + 1 < len(recommendations):
            right = RecommendationCard(
                i + 2, recommendations[i + 1][0], recommendations[i + 1][1],
                rec_col_width
            )
        else:
            right = Paragraph("", body_style)
        rec_rows.append([left, right])

    rec_table = Table(
        rec_rows,
        colWidths=[rec_col_width, rec_col_width],
        # rowHeights=None => altura automatica (evita recortes)
    )
    rec_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        # Espacio entre columnas
        ("LEFTPADDING", (1, 0), (1, -1), 12),
    ]))
    story.append(rec_table)
    story.append(Spacer(1, 14))

    # --- CTA final ---
    story.append(CTABanner(data["consultant"], USABLE_WIDTH))

    # Callback de footer
    def footer_callback(canvas, doc_obj):
        canvas.saveState()
        page_num = canvas.getPageNumber()
        y = MARGIN - 10
        # Linea superior fina morada
        canvas.setStrokeColor(COLOR_PURPLE)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, y + 6, PAGE_WIDTH - MARGIN, y + 6)
        # Texto del footer
        canvas.setFillColor(COLOR_GREY)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(MARGIN, y - 4, clean_plain("O2D - Oxigeno Digital | o2d.es"))
        center_text = clean_plain(
            f"{data['business_name']}  |  {data['date'].strftime('%d/%m/%Y')}"
        )
        canvas.drawCentredString(PAGE_WIDTH / 2, y - 4, center_text)
        canvas.drawRightString(
            PAGE_WIDTH - MARGIN, y - 4, f"Pagina {page_num}"
        )
        canvas.restoreState()

    doc.build(story, onFirstPage=footer_callback, onLaterPages=footer_callback)


# Alias explicito para uso desde web app (acepta io.BytesIO)
def build_pdf_to_buffer(data, buffer):
    """Genera el PDF directamente en un buffer en memoria (io.BytesIO)."""
    build_pdf(data, buffer)


# =============================================================================
# MAIN
# =============================================================================
def main():
    try:
        data = collect_data()
    except KeyboardInterrupt:
        print("\n\nGeneracion cancelada por el usuario.")
        sys.exit(0)

    slug = slugify(data["business_name"])
    date_str = data["date"].strftime("%Y%m%d")
    output_name = f"informe_gmb_{slug}_{date_str}.pdf"

    print("\nGenerando informe...")
    try:
        build_pdf(data, output_name)
    except Exception as e:
        print(f"\n[ERROR] No se pudo generar el PDF: {e}")
        raise

    print(f"\n[OK] Informe generado: {output_name}")


if __name__ == "__main__":
    main()
