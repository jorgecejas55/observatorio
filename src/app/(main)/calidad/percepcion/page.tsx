import PercepcionSocialForm from '@/components/forms/PercepcionSocialForm'

export default function PercepcionSocialPage() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Encabezado */}
      <div className="mb-8">
        <h2 className="section-title">Percepción Social del Turismo</h2>
        <p className="text-text-secondary text-sm -mt-6">
          Encuesta a residentes sobre su percepción del turismo en la ciudad.
          Los datos se registran directamente en Google Sheets.
        </p>
      </div>

      <PercepcionSocialForm />
    </div>
  )
}
