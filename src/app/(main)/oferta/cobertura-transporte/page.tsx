'use client'

export default function CoberturaTransportePage() {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <iframe
        src="/dashboards/cobertura-transporte.html"
        className="w-full flex-1 border-0"
        title="Cobertura de Transporte Turístico — ACC_B_02.3"
      />
    </div>
  )
}