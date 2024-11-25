'use client'

import { Card } from "@nextui-org/react"
import { AlertCircle, Loader2 } from "lucide-react"

interface StatusDisplayProps {
  type: 'error' | 'loading'
  message: string
}

export function StatusDisplay({ type, message }: StatusDisplayProps) {
  return (
    <Card className="p-4 h-full bg-default-50">
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        {type === 'error' ? (
          <AlertCircle className="w-12 h-12 text-danger" />
        ) : (
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        )}
        <p className={`text-lg text-center ${type === 'error' ? 'text-danger' : 'text-primary'}`}>
          {message}
        </p>
      </div>
    </Card>
  )
}
