export default function LoadingSpinner({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-secondary">
      <i className="fa-solid fa-spinner fa-spin text-3xl text-primary" />
      <p className="text-sm">{text}</p>
    </div>
  )
}
