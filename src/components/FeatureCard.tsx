import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  className?: string
}

export function FeatureCard({ icon, title, description, className }: FeatureCardProps) {
  return (
    <div className={cn(
      "p-6 border border-border rounded-lg hover:shadow-lg transition-all duration-300 hover:border-foreground/20",
      className
    )}>
      <div className="mb-4 text-foreground">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
} 