import { permanentRedirect } from 'next/navigation'

export default function Home() {
  // Permanente (308): los buscadores consolidan la home en /dashboard
  permanentRedirect('/dashboard')
}
