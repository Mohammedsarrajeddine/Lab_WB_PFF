import type { PrescriptionDetail } from '../../lib/api'

interface PrescriptionPanelProps {
  prescriptions: PrescriptionDetail[]
}

export default function PrescriptionPanel({
  prescriptions,
}: PrescriptionPanelProps) {
  if (prescriptions.length === 0) {
    return null
  }

  return (
    <section className="tonal-card panel-tint-warm rounded-2xl p-5 sm:p-6">
      <h3 className="m-0 mb-3 text-lg font-semibold text-[var(--sea-ink)]">
        📋 Ordonnances détectées ({prescriptions.length})
      </h3>
      <div className="space-y-3">
        {prescriptions.map((rx) => (
          <div
            key={rx.id}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface-elevated)]/82 p-4 shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full border border-emerald-300/60 bg-emerald-50/85 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {rx.extraction_status}
              </span>
              {rx.extracted_payload?.confidence != null ? (
                <span className="text-xs text-[var(--sea-ink-soft)]">
                  Confiance :{' '}
                  {Math.round(rx.extracted_payload.confidence * 100)}%
                </span>
              ) : null}
              {rx.extracted_payload?.source ? (
                <span className="text-xs text-[var(--sea-ink-soft)]">
                  via {rx.extracted_payload.source}
                </span>
              ) : null}
            </div>

            {rx.extracted_payload?.doctor_name ? (
              <p className="m-0 text-sm">
                <strong>Médecin :</strong> {rx.extracted_payload.doctor_name}
              </p>
            ) : null}
            {rx.extracted_payload?.patient_name ? (
              <p className="m-0 text-sm">
                <strong>Patient :</strong> {rx.extracted_payload.patient_name}
              </p>
            ) : null}
            {rx.extracted_payload?.date ? (
              <p className="m-0 text-sm">
                <strong>Date :</strong> {rx.extracted_payload.date}
              </p>
            ) : null}

            {rx.extracted_payload?.detected_analyses &&
            rx.extracted_payload.detected_analyses.length > 0 ? (
              <div className="mt-2">
                <p className="m-0 text-sm font-semibold">
                  Analyses détectées :
                </p>
                <ul className="m-0 mt-1 list-disc pl-5">
                  {rx.extracted_payload.detected_analyses.map((a, i) => (
                    <li key={i} className="text-sm text-[var(--sea-ink)]">
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {rx.extracted_payload?.pricing_data && (
              <div className="mt-3 rounded-lg border border-[rgba(0,74,198,0.22)] bg-[var(--surface-strong)]/94 p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                  <p className="m-0 text-sm font-semibold text-[var(--lagoon-deep)]">
                    Estimation des coûts :
                  </p>
                  <span className="rounded-full border border-[rgba(0,74,198,0.28)] bg-[rgba(37,99,235,0.12)] px-2.5 py-0.5 text-xs font-semibold text-[var(--lagoon-deep)]">
                    🏥 {rx.extracted_payload.pricing_data.insurance_label || 'Payant'}{' '}
                    {rx.extracted_payload.pricing_data.coverage_pct > 0
                      ? `(${rx.extracted_payload.pricing_data.coverage_pct}%)`
                      : ''}
                  </span>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th className="w-[60px] py-1 font-medium text-[var(--sea-ink-soft)]">Code</th>
                      <th className="py-1 font-medium text-[var(--sea-ink-soft)]">Analyse</th>
                      <th className="py-1 text-right font-medium text-[var(--sea-ink-soft)]">Prix (DH)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {rx.extracted_payload.pricing_data.itemized_prices.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-1 text-[var(--sea-ink)] text-xs">{item.code || '-'}</td>
                        <td className="py-1 text-[var(--sea-ink)]">{item.name}</td>
                        <td className="py-1 text-[var(--sea-ink)] text-right font-medium">
                          {item.price_dh.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {rx.extracted_payload.pricing_data.prelevement_dh > 0 && (
                      <tr className="bg-[var(--surface-strong)]/40">
                        <td className="py-1 text-[var(--sea-ink-soft)] text-xs">—</td>
                        <td className="py-1 text-[var(--sea-ink-soft)] italic">Prélèvement sanguin</td>
                        <td className="py-1 text-[var(--sea-ink-soft)] text-right font-medium">
                          {rx.extracted_payload.pricing_data.prelevement_dh.toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[var(--line)]">
                      <td colSpan={2} className="py-1.5 text-right font-semibold text-[var(--sea-ink)]">
                        Total brut :
                      </td>
                      <td className="py-1.5 text-right font-bold text-[var(--sea-ink)]">
                        {rx.extracted_payload.pricing_data.estimated_total_dh.toFixed(2)} DH
                      </td>
                    </tr>
                    {rx.extracted_payload.pricing_data.coverage_pct > 0 && (
                      <>
                        <tr>
                          <td colSpan={2} className="py-1 text-right text-sm text-emerald-700">
                            🏥 {rx.extracted_payload.pricing_data.insurance_label} ({rx.extracted_payload.pricing_data.coverage_pct}%) :
                          </td>
                          <td className="py-1 text-right text-sm font-medium text-emerald-600">
                            −{rx.extracted_payload.pricing_data.insurance_covers_dh.toFixed(2)} DH
                          </td>
                        </tr>
                        <tr className="border-t-2 border-[var(--lagoon-deep)]/30">
                          <td colSpan={2} className="py-2 text-right font-bold text-[var(--lagoon-deep)]">
                            👤 À la charge du patient :
                          </td>
                          <td className="py-2 text-right text-lg font-extrabold text-[var(--lagoon-deep)]">
                            {rx.extracted_payload.pricing_data.patient_pays_dh.toFixed(2)} DH
                          </td>
                        </tr>
                      </>
                    )}
                    {rx.extracted_payload.pricing_data.coverage_pct === 0 && (
                      <tr className="border-t-2 border-[var(--lagoon-deep)]/30">
                        <td colSpan={2} className="py-2 text-right font-bold text-[var(--lagoon-deep)]">
                          👤 À payer :
                        </td>
                        <td className="py-2 text-right text-lg font-extrabold text-[var(--lagoon-deep)]">
                          {rx.extracted_payload.pricing_data.patient_pays_dh.toFixed(2)} DH
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            )}

            {rx.file_url ? (
              <a
                href={rx.file_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-semibold"
              >
                📎 Voir le document original
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
