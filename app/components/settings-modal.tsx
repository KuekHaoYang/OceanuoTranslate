'use client'

import { Modal, ModalContent, ModalHeader, ModalBody, Input, Select, SelectItem, Button } from "@nextui-org/react"
import { useTheme } from "../contexts/theme-context"
import { openaiModels } from "../constants/openai-models"
import { groqModels } from "../constants/groq-models"
import { useState, useEffect } from "react"
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '../utils/localStorage'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const [apiHost, setApiHost] = useState(getLocalStorage('apiHost', 'https://api.openai.com/v1'))
  const [apiKey, setApiKey] = useState(getLocalStorage('apiKey', ''))
  const [selectedModel, setSelectedModel] = useState(getLocalStorage('selectedModel', 'gpt-4o-mini'))
  const [translationService, setTranslationService] = useState(getLocalStorage('translationService', 'openai'))
  const [showApiKey, setShowApiKey] = useState(false)
  const [isMobile, setIsMobile] = useState(false);

  // Load initial values from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setApiHost(getLocalStorage('apiHost', 'https://api.openai.com/v1'));
    setApiKey(getLocalStorage('apiKey', ''));
    setSelectedModel(getLocalStorage('selectedModel', 'gpt-4o-mini'));
    setTranslationService(getLocalStorage('translationService', 'openai'));
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLocalStorage('theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSave = () => {
    if (typeof window === 'undefined') return;
    setLocalStorage('apiHost', apiHost);
    setLocalStorage('apiKey', apiKey);
    setLocalStorage('selectedModel', selectedModel);
    setLocalStorage('translationService', translationService);
    // Dispatch storage event for other components to detect the change
    window.dispatchEvent(new Event('storage'))
    onClose()
  }

  const handleRestoreDefaults = () => {
    if (typeof window === 'undefined') return;
    // Clear all settings from localStorage
    removeLocalStorage('apiHost');
    removeLocalStorage('apiKey');
    removeLocalStorage('selectedModel');
    removeLocalStorage('translationService');
    
    // Reset state to default values
    setApiHost('https://api.openai.com/v1')
    setApiKey('')
    setSelectedModel('gpt-4o-mini')
    setTranslationService('openai')
    setTheme('system')
  }

  const handleTranslationServiceChange = (value: string) => {
    setTranslationService(value)
    if (value === 'groq') {
      setApiHost('https://api.groq.com/openai/v1')
      setSelectedModel('mixtral-8x7b-32768')
    } else if (value === 'deepl') {
      setApiHost('')
      setSelectedModel('')
      setApiKey('')
    } else {
      setApiHost('https://api.openai.com/v1')
      setSelectedModel('gpt-4o-mini')
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      classNames={{
        base: isMobile ? "settings-modal-mobile" : "",
        wrapper: isMobile ? "items-start !m-0" : "",
        backdrop: isMobile ? "!bg-background" : "",
      }}
      size={isMobile ? "full" : "2xl"}
      hideCloseButton={isMobile}
      motionProps={{
        variants: {
          enter: {
            y: isMobile ? 0 : undefined,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut"
            }
          },
          exit: {
            y: isMobile ? 0 : undefined,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn"
            }
          }
        }
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Settings</h2>
                {isMobile && (
                  <Button
                    isIconOnly
                    variant="light"
                    onPress={onClose}
                    className="text-default-500"
                  >
                    ✕
                  </Button>
                )}
              </div>
              <p className="text-sm text-default-500">Configure your translation preferences</p>
            </ModalHeader>
            <ModalBody className="gap-8 pb-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Theme</h3>
                    <div className="h-px flex-1 bg-default-100"></div>
                  </div>
                  <Select
                    label="Choose your preferred theme"
                    selectedKeys={[theme]}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === 'light' || value === 'dark' || value === 'system') {
                        setTheme(value)
                      }
                    }}
                    size="lg"
                    variant="bordered"
                    classNames={{
                      trigger: "h-12",
                      value: "text-base",
                      label: "text-default-500"
                    }}
                    className="w-full max-w-md"
                  >
                    <SelectItem key="light" value="light">Light</SelectItem>
                    <SelectItem key="dark" value="dark">Dark</SelectItem>
                    <SelectItem key="system" value="system">System</SelectItem>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Translation Service</h3>
                    <div className="h-px flex-1 bg-default-100"></div>
                  </div>
                  <div className="space-y-6">
                    <Select
                      label="Choose your translation service"
                      selectedKeys={[translationService]}
                      onChange={(e) => handleTranslationServiceChange(e.target.value)}
                      size="lg"
                      variant="bordered"
                      classNames={{
                        trigger: "h-12",
                        value: "text-base",
                        label: "text-default-500"
                      }}
                      className="w-full"
                    >
                      <SelectItem key="openai" value="openai">OpenAI</SelectItem>
                      <SelectItem key="groq" value="groq">Groq</SelectItem>
                      <SelectItem key="deepl" value="deepl">DeepL</SelectItem>
                    </Select>
                    <div>
                      {translationService !== 'deepl' && (
                        <div className="space-y-6">
                          <div>
                            <Input
                              type="url"
                              label="API Host"
                              placeholder="Enter API host"
                              value={apiHost}
                              onChange={(e) => setApiHost(e.target.value)}
                              variant="bordered"
                              size="lg"
                              classNames={{
                                input: "text-base",
                                inputWrapper: "h-16",
                                label: "text-default-500"
                              }}
                            />
                            <div className="text-sm text-default-500 mt-2 px-1">
                              <span>Full API endpoint: {`${apiHost}/chat/completions`}</span>
                            </div>
                          </div>

                          <Input
                            type={showApiKey ? "text" : "password"}
                            label="API Key"
                            placeholder="Enter your API key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            variant="bordered"
                            size="lg"
                            endContent={
                              <button
                                className="focus:outline-none h-full flex items-center"
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                              >
                                {showApiKey ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                  </svg>
                                )}
                              </button>
                            }
                            classNames={{
                              input: "text-base",
                              inputWrapper: "h-16",
                              label: "text-default-500",
                              innerWrapper: "flex items-center"
                            }}
                          />
                          <Select
                            label="Model"
                            placeholder="Select a model"
                            selectedKeys={selectedModel ? [selectedModel] : []}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            size="lg"
                            variant="bordered"
                            classNames={{
                              trigger: "h-12",
                              value: "text-base",
                              label: "text-default-500"
                            }}
                          >
                            {(translationService === 'openai' ? openaiModels : groqModels).map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-default-100">
                <Button 
                  color="danger" 
                  variant="flat" 
                  onPress={handleRestoreDefaults}
                  size="lg"
                  className="font-medium"
                >
                  Restore Defaults
                </Button>
                <Button 
                  color="default" 
                  variant="light" 
                  onPress={onClose}
                  size="lg"
                  className="font-medium"
                >
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleSave}
                  size="lg"
                  className="font-medium"
                >
                  Save Changes
                </Button>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
