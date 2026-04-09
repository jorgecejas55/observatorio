interface BadgeProps {
  children: React.ReactNode
  color?: 'primary' | 'orange' | 'cyan' | 'green' | 'gray'
}

const colorMap: Record<string, string> = {
  primary: 'bg-primary text-white',
  orange: 'bg-orange-500 text-white',
  cyan: 'bg-cyan-600 text-white',
  green: 'bg-green-600 text-white',
  gray: 'bg-gray-200 text-gray-700',
}

export default function Badge({ children, color = 'gray' }: BadgeProps) {
  return (
    <span className={`badge ${colorMap[color] ?? colorMap.gray}`}>
      {children}
    </span>
  )
}
