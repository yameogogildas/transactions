from fpdf import FPDF

def generer_recu_pdf(transaction, utilisateur):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)

    pdf.cell(200, 10, txt="Reçu de Transaction", ln=True, align='C')
    pdf.ln(10)
    pdf.cell(200, 10, txt=f"Nom du client: {utilisateur.nom}", ln=True)
    pdf.cell(200, 10, txt=f"Email du client: {utilisateur.email}", ln=True)
    pdf.cell(200, 10, txt=f"Montant: {transaction.montant} {transaction.devise}", ln=True)
    pdf.cell(200, 10, txt=f"Service: {transaction.service}", ln=True)
    pdf.cell(200, 10, txt=f"Numéro Transaction: {transaction.numero_transaction}", ln=True)
    pdf.cell(200, 10, txt=f"Statut: {transaction.statut}", ln=True)
    pdf.cell(200, 10, txt=f"Date: {transaction.date_transaction}", ln=True)

    filename = f"recu_transaction_{transaction.id}.pdf"
    pdf.output(filename)
    return filename
