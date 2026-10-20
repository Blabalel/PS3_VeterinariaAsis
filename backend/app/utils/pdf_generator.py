from fpdf import FPDF

def generar_pdf_historial(paciente, historiales):
    pdf = FPDF()
    pdf.add_page()
    
    # Encabezado
    pdf.set_font("Arial", "B", 16)
    pdf.cell(200, 10, txt="VETERINARIA SAN FRANCISCO DE ASÍS", ln=True, align="C")
    pdf.set_font("Arial", "", 12)
    pdf.cell(200, 10, txt=f"Historial Clínico - Paciente: {paciente.nombre}", ln=True, align="C")
    pdf.ln(10)
    
    # Datos del Paciente
    pdf.set_font("Arial", "B", 11)
    pdf.cell(200, 10, txt=f"Especie: {paciente.especie} | Raza: {paciente.raza or 'No registrada'} | Sexo: {paciente.sexo}", ln=True)
    pdf.ln(5)
    
    # Iterar sobre las consultas
    for idx, h in enumerate(historiales, 1):
        pdf.set_font("Arial", "B", 10)
        gravedad = str(h.nivel_gravedad).upper() if h.nivel_gravedad else "SIN CLASIFICAR"
        pdf.cell(200, 8, txt=f"Consulta #{idx} - Prioridad: {gravedad} ({h.puntaje_riesgo or 0} pts)", ln=True)
        
        pdf.set_font("Arial", "", 10)
        fecha = h.fecha_consulta.strftime('%Y-%m-%d %H:%M') if h.fecha_consulta else "N/A"
        motivo = h.motivo or "Sin motivo"
        notas_vet = h.notas_veterinario or "Caso pendiente de revisión o sin notas"
        
        contenido = f"Fecha: {fecha}\nMotivo: {motivo}\nNotas Veterinario: {notas_vet}"
        pdf.multi_cell(0, 6, txt=contenido)
        pdf.ln(5)
        
    pdf_output = pdf.output(dest='S')
    if isinstance(pdf_output, str):
        return pdf_output.encode('latin1')
    return bytes(pdf_output)