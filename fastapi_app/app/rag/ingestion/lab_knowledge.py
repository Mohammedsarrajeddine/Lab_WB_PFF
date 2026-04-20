"""French knowledge base about the medical laboratory in Rabat.

Each chunk is a self-contained piece of information optimised for embedding
and semantic retrieval. Categories help with traceability.
"""

from __future__ import annotations
from dataclasses import dataclass

@dataclass(frozen=True)
class KnowledgeDocument:
    category: str
    content: str

LAB_KNOWLEDGE: list[KnowledgeDocument] = [
    # --- Horaires & Localisation ---
    KnowledgeDocument(
        category="horaires",
        content=(
            "Le laboratoire d'analyses médicales PFF Rabat est ouvert en continu "
            "du lundi au vendredi de 7h30 à 18h30, et le samedi de 7h30 à 13h00. "
            "Le laboratoire est fermé le dimanche et les jours fériés."
        ),
    ),
    KnowledgeDocument(
        category="localisation",
        content=(
            "Le laboratoire est situé au cœur de Rabat, quartier Agdal, Avenue Fal Ould Oumeir. "
            "Un parking gratuit est réservé à notre patientèle juste devant l'entrée principale."
        ),
    ),
    KnowledgeDocument(
        category="prelevement_domicile",
        content=(
            "Nous proposons un service de prélèvement sanguin à domicile sur Rabat et Salé "
            "pour les personnes âgées, à mobilité réduite ou sur simple rendez-vous. "
            "La prise de rendez-vous se fait idéalement la veille par WhatsApp ou par téléphone."
        ),
    ),

    # --- Préparation aux Prélèvements ---
    KnowledgeDocument(
        category="jeune",
        content=(
            "Combien de temps faut-il rester à jeun ? "
            "Il est impératif d'être à jeun strict (ne boire que de l'eau) pendant au moins 12 heures "
            "pour le Bilan Lipidique (Cholestérol, Triglycérides) et 8 à 10 heures pour la Glycémie à jeun."
        ),
    ),
    KnowledgeDocument(
        category="urines",
        content=(
            "Comment faire un prélèvement d'urine (ECBU) ? "
            "Faites une toilette intime méticuleuse à l'eau et au savon. "
            "Éliminez le premier jet d'urine aux toilettes, puis recueillez le 'milieu de jet' "
            "dans le flacon stérile fourni par le labo ou acheté en pharmacie. "
            "Le flacon doit être ramené au laboratoire dans un délai maximum de 2 heures."
        ),
    ),
    KnowledgeDocument(
        category="selles",
        content=(
            "Pour les analyses de selles (Coproculture, recherche de parasites) : "
            "Recueillez les selles dans un pot stérile et apportez-le au laboratoire le plus rapidement possible. "
            "Évitez les traitements laxatifs ou antibiotiques juste avant, sauf avis médical contraire."
        ),
    ),
    KnowledgeDocument(
        category="bebes",
        content=(
            "Prélèvements pour les bébés et jeunes enfants : "
            "Nos infirmiers sont spécialement formés pour les prises de sang pédiatriques. "
            "Pour la récolte d'urine chez le nourrisson, nous disposons de poches adhésives spéciales "
            "(collecteurs d'urine pédiatrique) que nous posons avec soin au laboratoire."
        ),
    ),

    # --- Tarifications & Prise en Charge ---
    KnowledgeDocument(
        category="tarification",
        content=(
            "Tarifs indicatifs (selon la nomenclature B marocaine) : "
            "NFS coûte environ 70 DH. "
            "Bilan Lipidique complet (Cholestérol Total, HDL, LDL, Triglycérides) coûte environ 120 DH. "
            "Glycémie à jeun coûte 30 DH. "
            "Hémoglobine Glyquée (HbA1c) coûte environ 100 DH."
        ),
    ),
    KnowledgeDocument(
        category="tarification",
        content=(
            "Tarifs spécifiques : "
            "Bilan Thyroïdien (TSH, FT4) est estimé à environ 250 DH. "
            "Test PCR COVID-19 est à 400 DH (résultat en 12h). "
            "Vitamine D coûte environ 300 DH."
        ),
    ),
    KnowledgeDocument(
        category="mutuelle",
        content=(
            "Assurances et Mutuelles : "
            "Le laboratoire est conventionné avec la CNOPS, CNSS (AMO), FAR, et diverses assurances privées "
            "(Saham, RMA, Wafa Assurance). "
            "Apportez votre prise en charge ou les feuilles de soins avec votre CIN et la copie de l'ordonnance."
        ),
    ),

    # --- Délais et Résultats ---
    KnowledgeDocument(
        category="resultats_delais",
        content=(
            "Quels sont les délais des résultats ? "
            "Les bilans standards (NFS, glycémie, foie, rein) sont disponibles le jour même (généralement après 15h). "
            "Les sérologies et bilans hormonaux prennent entre 24h et 48h. "
            "Les examens bactériologiques (cultures, ECBU) nécessitent 48h à 72h pour laisser germer la culture."
        ),
    ),
    KnowledgeDocument(
        category="resultats_reception",
        content=(
            "Comment récupérer les résultats ? "
            "Vos résultats validés par le médecin biologiste vous sont directement envoyés sous format PDF "
            "sécurisé via ce fil WhatsApp. "
            "Vous pouvez aussi les récupérer en version papier au comptoir ou les consulter sur notre site web."
        ),
    ),

    # --- Informations Administratives ---
    KnowledgeDocument(
        category="ordonnance",
        content=(
            "Faut-il toujours une ordonnance ? "
            "Il est fortement recommandé d'avoir une ordonnance médicale pour le remboursement par votre mutuelle. "
            "Toutefois, vous pouvez réaliser vos bilans 'sans ordonnance' à vos propres frais "
            "(ex: bilan de routine, dépistage diabète, test de grossesse)."
        ),
    ),
    KnowledgeDocument(
        category="grossesse",
        content=(
            "Test de grossesse (Bêta HCG plasmatique) : "
            "L'analyse sanguine pour diagnostiquer la grossesse peut être faite à tout moment de la journée, "
            "il n'est pas nécessaire d'être à jeun. Les résultats sont prêts en 2 à 3 heures."
        ),
    ),

    # --- Chatbot Persona & Protocol ---
    KnowledgeDocument(
        category="contact",
        content=(
            "En tant qu'assistant virtuel du laboratoire PFF, je réponds 24h/24 et 7j/7 aux questions "
            "des patients sur les tarifs, les préparations aux examens, et les horaires. "
            "Si un patient souhaite me transmettre son ordonnance médicale pour qu'on commence la paperasse, "
            "je l'invite simplement à envoyer la photo de son ordonnance dans cette discussion."
        ),
    ),
]
