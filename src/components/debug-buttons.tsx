"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  Mic, 
  Search, 
  Bot
} from "lucide-react"

interface DebugButtonsProps {
  className?: string
}

export function DebugButtons({ className }: DebugButtonsProps) {
  const [clickCount, setClickCount] = useState(0)

  return (
    <div className="flex items-center gap-2">
      {/* Voice Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`${className} border-green-300 bg-green-50 text-green-600 hover:bg-green-100`}
              onClick={() => {
                setClickCount(prev => prev + 1)
                alert(`Voice button clicked! Count: ${clickCount + 1}`)
              }}
            >
              <Mic size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Debug Voice Button</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* AI Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`${className} border-primary/20 bg-primary/10 text-primary hover:bg-primary/20`}
              onClick={() => {
                setClickCount(prev => prev + 1)
                alert(`AI button clicked! Count: ${clickCount + 1}`)
              }}
            >
              <Bot size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Debug AI Button</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Search Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`${className} h-9 w-9 p-0 text-primary-foreground hover:bg-primary-foreground/10`}
              onClick={() => {
                setClickCount(prev => prev + 1)
                alert(`Search button clicked! Count: ${clickCount + 1}`)
              }}
            >
              <Search size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Debug Search Button</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Status Badge */}
      <Badge variant="outline" className="text-xs">
        Debug: {clickCount}
      </Badge>
    </div>
  )
}
