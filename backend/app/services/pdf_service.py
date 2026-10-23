"""Servicio de generación de PDFs para historiales clínicos."""
from fpdf import FPDF


def _texto(valor, reemplazo: str = "N/A") -> str:
    """Convierte texto a latin-1 para las fuentes core de PDF.

    Evita que un emoji o un carácter fuera de latin-1 rompa la generación.
    """
    if valor is None or valor == "":
        return reemplazo
    return str(valor).encode("latin-1", "replace").decode("latin-1")


def generar_pdf_historial(paciente, historiales) -> bytes:
    """
    Genera un PDF con el historial clínico de un paciente.

    Args:
        paciente: Objeto modelo Paciente con datos del paciente.
        historiales: Lista de objetos HistorialClinico.

    Returns:
        Bytes del PDF generado.
    """
    pdf = FPDF()
    pdf.add_page()

    # Encabezado
    pdf.set_font("Arial", "B", 16)
    pdf.cell(200, 10, txt="VETERINARIA SAN FRANCISCO DE ASÍS", ln=True, align="C")
    pdf.set_font("Arial", "", 12)
    pdf.cell(200, 10, txt=f"Historial Clínico - Paciente: {_texto(paciente.nombre)}", ln=True, align="C")
    pdf.ln(10)

    # Datos del Paciente
    pdf.set_font("Arial", "B", 11)
    pdf.cell(200, 10, txt=f"Especie: {_texto(paciente.especie)} | Raza: {_texto(paciente.raza, 'No registrada')} | Sexo: {_texto(paciente.sexo)}", ln=True)
    pdf.ln(5)

    # Iterar sobre las consultas
    for idx, h in enumerate(historiales, 1):
        pdf.set_font("Arial", "B", 10)
        gravedad = _texto(str(h.nivel_gravedad).upper() if h.nivel_gravedad else "SIN CLASIFICAR")
        pdf.cell(200, 8, txt=f"Consulta #{idx} - Prioridad: {gravedad} ({h.puntaje_riesgo or 0} pts)", ln=True)

        pdf.set_font("Arial", "", 10)
        fecha = h.fecha_consulta.strftime('%Y-%m-%d %H:%M') if h.fecha_consulta else "N/A"
        motivo = _texto(h.motivo, "Sin motivo")
        notas_vet = _texto(h.notas_veterinario, "Caso pendiente de revisión o sin notas")

        contenido = f"Fecha: {fecha}\nMotivo: {motivo}\nNotas Veterinario: {notas_vet}"
        pdf.multi_cell(0, 6, txt=contenido)
        pdf.ln(5)

    pdf_output = pdf.output(dest='S')
    if isinstance(pdf_output, str):
        return pdf_output.encode('latin1')
    return bytes(pdf_output)