"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  Bot, 
  Mic, 
  Search, 
  Wifi, 
  WifiOff,
  Sparkles
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { AIAssistant } from "@/components/ai-assistant"
import { VoiceInputButton } from "@/components/voice-input-button"
import { VoiceEnabledSearch } from "@/components/voice-enabled-search"

interface AIUnifiedButtonProps {
  className?: string
  currentLoanId?: string
}

export function AIUnifiedButton({ className, currentLoanId }: AIUnifiedButtonProps) {
  const { language, t } = useLanguage()
  const [isOnline, setIsOnline] = useState(true)
  const [showInternetDialog, setShowInternetDialog] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [showVoiceInput, setShowVoiceInput] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)

  // Check internet connectivity
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    // Initial check
    updateOnlineStatus()

    // Listen for connectivity changes
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const handleAIFeatureClick = (feature: 'assistant' | 'voice' | 'search') => {
    if (!isOnline) {
      setShowInternetDialog(true)
      return
    }

    switch (feature) {
      case 'assistant':
        setShowAIAssistant(true)
        break
      case 'voice':
        setShowVoiceInput(true)
        break
      case 'search':
        setShowSearchDialog(true)
        break
    }
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`${className} relative border-primary/20 bg-primary/10 text-primary hover:bg-primary/20`}
                >
                  <Bot size={20} />
                  {!isOnline && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                      <WifiOff size={8} className="text-white" />
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    <span className="font-medium text-sm">
                      {language === 'hi' ? 'AI सुविधाएं' : 'AI Features'}
                    </span>
                    {isOnline ? (
                      <Wifi size={12} className="text-green-500 ml-auto" />
                    ) : (
                      <WifiOff size={12} className="text-red-500 ml-auto" />
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => handleAIFeatureClick('assistant')}
                  className="flex items-center gap-2"
                >
                  <Bot size={16} />
                  <span>{language === 'hi' ? 'AI असिस्टेंट' : 'AI Assistant'}</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => handleAIFeatureClick('voice')}
                  className="flex items-center gap-2"
                >
                  <Mic size={16} />
                  <span>{language === 'hi' ? 'वॉइस कमांड' : 'Voice Command'}</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => handleAIFeatureClick('search')}
                  className="flex items-center gap-2"
                >
                  <Search size={16} />
                  <span>{language === 'hi' ? 'AI खोज' : 'AI Search'}</span>
                </DropdownMenuItem>

                {!isOnline && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <p className="text-xs text-red-600">
                        {language === 'hi' 
                          ? 'AI सुविधाओं के लिए इंटरनेट कनेक्शन आवश्यक है'
                          : 'Internet connection required for AI features'
                        }
                      </p>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isOnline 
                ? (language === 'hi' ? 'AI सुविधाएं' : 'AI Features')
                : (language === 'hi' ? 'इंटरनेट आवश्यक' : 'Internet Required')
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Internet Required Dialog */}
      <Dialog open={showInternetDialog} onOpenChange={setShowInternetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-red-500" />
              {language === 'hi' ? 'इंटरनेट कनेक्शन आवश्यक' : 'Internet Connection Required'}
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <p>
                {language === 'hi' 
                  ? 'AI सुविधाओं का उपयोग करने के लिए इंटरनेट कनेक्शन की आवश्यकता है।'
                  : 'An internet connection is required to use AI features.'
                }
              </p>
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  {language === 'hi' 
                    ? '• AI असिस्टेंट चैट\n• वॉइस कमांड\n• स्मार्ट खोज'
                    : '• AI Assistant Chat\n• Voice Commands\n• Smart Search'
                  }
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'hi' 
                  ? 'कृपया अपना इंटरनेट कनेक्शन जांचें और फिर से कोशिश करें।'
                  : 'Please check your internet connection and try again.'
                }
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowInternetDialog(false)} variant="outline">
              {language === 'hi' ? 'समझ गया' : 'Got it'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Assistant Dialog */}
      {showAIAssistant && (
        <AIAssistant 
          currentLoanId={currentLoanId} 
          isOpen={showAIAssistant} 
          onOpenChange={setShowAIAssistant} 
        />
      )}

      {/* Voice Input Dialog */}
      {showVoiceInput && (
        <div className="fixed inset-0 z-50">
          <VoiceInputButton currentLoanId={currentLoanId} />
        </div>
      )}

      {/* Search Dialog */}
      {showSearchDialog && (
        <div className="fixed inset-0 z-50">
          <VoiceEnabledSearch />
        </div>
      )}
    </>
  )
}
