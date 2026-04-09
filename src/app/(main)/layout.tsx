import SessionWrapper from '@/components/layout/SessionWrapper'
import MainLayoutClient from '@/components/layout/MainLayoutClient'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionWrapper>
      <MainLayoutClient>{children}</MainLayoutClient>
    </SessionWrapper>
  )
}
