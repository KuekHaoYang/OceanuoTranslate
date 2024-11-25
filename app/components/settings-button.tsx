'use client'

import { Button } from "@nextui-org/react"
import { Settings } from 'lucide-react'
import { useState } from "react"
import { SettingsModal } from "./settings-modal"

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button 
        isIconOnly
        variant="light"
        aria-label="Settings"
        onPress={() => setIsOpen(true)}
      >
        <Settings className="w-5 h-5" />
      </Button>
      <SettingsModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
