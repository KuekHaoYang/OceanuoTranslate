'use client'

import { Modal, ModalContent, ModalHeader, ModalBody, Input, Select, SelectItem, Button, Card, Tabs, Tab } from "@nextui-org/react"
import { useTheme } from "../contexts/theme-context"
import { openaiModels } from "../constants/openai-models"
import { groqModels } from "../constants/groq-models"
import { useState, useEffect } from "react"
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '../utils/localStorage'
import { languages } from "../constants/languages"
import { deeplLanguages } from "../constants/deepl-languages"

interface TranslationPreset {
  id: string
  shortcut: string
  sourceLang: string
  targetLang: string
}

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
  const [shortcutKey, setShortcutKey] = useState(getLocalStorage('shortcutKey', 'Control+Enter'))
  const [showApiKey, setShowApiKey] = useState(false)
  const [isMobile, setIsMobile] = useState(false);
  const [translationPresets, setTranslationPresets] = useState<TranslationPreset[]>([])
  const [newPresetShortcut, setNewPresetShortcut] = useState('')
  const [newPresetSourceLang, setNewPresetSourceLang] = useState('auto-detect')
  const [newPresetTargetLang, setNewPresetTargetLang] = useState('English')
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
  const [selectedTab, setSelectedTab] = useState("service")

  // Load initial values from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setApiHost(getLocalStorage('apiHost', 'https://api.openai.com/v1'));
    setApiKey(getLocalStorage('apiKey', ''));
    setSelectedModel(getLocalStorage('selectedModel', 'gpt-4o-mini'));
    setTranslationService(getLocalStorage('translationService', 'openai'));
    setShortcutKey(getLocalStorage('shortcutKey', 'Control+Enter'));
  }, []);

  // Load translation presets from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedPresets = getLocalStorage('translationPresets');
    if (savedPresets) {
      try {
        setTranslationPresets(JSON.parse(savedPresets));
      } catch (error) {
        console.error('Error parsing translation presets:', error);
      }
    }
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
    setLocalStorage('shortcutKey', shortcutKey);
    setLocalStorage('translationPresets', JSON.stringify(translationPresets));
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
    removeLocalStorage('shortcutKey');
    removeLocalStorage('translationPresets');
    
    // Reset state to default values
    setApiHost('https://api.openai.com/v1')
    setApiKey('')
    setSelectedModel('gpt-4o-mini')
    setTranslationService('openai')
    setShortcutKey('Control+Enter')
    setTheme('system')
    setTranslationPresets([])
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

  const handleAddPreset = () => {
    if (!newPresetShortcut) return;
    
    const newPreset: TranslationPreset = {
      id: Math.random().toString(36).substr(2, 9),
      shortcut: newPresetShortcut,
      sourceLang: newPresetSourceLang,
      targetLang: newPresetTargetLang
    };

    const updatedPresets = [...translationPresets, newPreset];
    setTranslationPresets(updatedPresets);
    setLocalStorage('translationPresets', JSON.stringify(updatedPresets));
    
    // Reset input fields
    setNewPresetShortcut('');
  };

  const handleRemovePreset = (id: string) => {
    const updatedPresets = translationPresets.filter(preset => preset.id !== id);
    setTranslationPresets(updatedPresets);
    setLocalStorage('translationPresets', JSON.stringify(updatedPresets));
  };

  const handleShortcutKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    const modifiers = [];
    if (e.ctrlKey) modifiers.push('Control');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.metaKey) modifiers.push('Meta');
    
    const key = e.key;
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      const newShortcut = [...modifiers, key].join('+');
      setNewPresetShortcut(newShortcut);
      setIsRecordingShortcut(false);
    }
  };

  const handleShortcutKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      setIsRecordingShortcut(false);
    }
  };

  const handleShortcutFocus = () => {
    setIsRecordingShortcut(true);
    setNewPresetShortcut('');
  };

  const handleShortcutBlur = () => {
    setIsRecordingShortcut(false);
  };

  const renderServiceSettings = () => (
    <div className="space-y-6">
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
  )

  const renderShortcutsAndPresets = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Translation Shortcuts</h3>
          <div className="h-px flex-1 bg-default-100"></div>
        </div>
        <div className="relative">
          <Input
            label="Global Translation Shortcut"
            value={shortcutKey}
            readOnly
            placeholder="Click here and press any key combination..."
            onKeyDown={(e) => {
              e.preventDefault();
              const modifiers = [];
              if (e.ctrlKey) modifiers.push('Control');
              if (e.altKey) modifiers.push('Alt');
              if (e.shiftKey) modifiers.push('Shift');
              if (e.metaKey) modifiers.push('Meta');
              
              const key = e.key;
              if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
                const newShortcut = [...modifiers, key].join('+');
                setShortcutKey(newShortcut);
              }
            }}
            onClick={() => {
              setShortcutKey('');
            }}
            size="lg"
            variant="bordered"
            classNames={{
              input: "text-base",
              inputWrapper: "h-16",
              label: "text-default-500"
            }}
            className="w-full"
          />
          <div className="text-sm text-default-500 mt-2 px-1">
            Current shortcut: {shortcutKey || 'None'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Language Presets</h3>
          <div className="h-px flex-1 bg-default-100"></div>
        </div>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Preset Shortcut"
                placeholder={isRecordingShortcut ? "Press your desired shortcut..." : "Click to record shortcut"}
                value={newPresetShortcut}
                onKeyDown={handleShortcutKeyDown}
                onKeyUp={handleShortcutKeyUp}
                onFocus={handleShortcutFocus}
                onBlur={handleShortcutBlur}
                readOnly
                variant="bordered"
                size="lg"
                classNames={{
                  input: "text-base",
                  inputWrapper: "h-16",
                  label: "text-default-500"
                }}
              />
              <Select
                label="From"
                selectedKeys={[newPresetSourceLang]}
                onChange={(e) => setNewPresetSourceLang(e.target.value)}
                size="lg"
                variant="bordered"
                classNames={{
                  trigger: "h-12",
                  value: "text-base",
                  label: "text-default-500"
                }}
              >
                {(translationService === 'deepl' ? deeplLanguages : ["auto-detect", ...languages]).map((lang) => (
                  <SelectItem 
                    key={typeof lang === 'string' ? lang : lang.code} 
                    value={typeof lang === 'string' ? lang : lang.code}
                  >
                    {typeof lang === 'string' ? lang : lang.name}
                  </SelectItem>
                ))}
              </Select>
              <Select
                label="To"
                selectedKeys={[newPresetTargetLang]}
                onChange={(e) => setNewPresetTargetLang(e.target.value)}
                size="lg"
                variant="bordered"
                classNames={{
                  trigger: "h-12",
                  value: "text-base",
                  label: "text-default-500"
                }}
              >
                {(translationService === 'deepl' ? deeplLanguages.filter(lang => lang.code !== 'auto-detect') : languages).map((lang) => (
                  <SelectItem 
                    key={typeof lang === 'string' ? lang : lang.code} 
                    value={typeof lang === 'string' ? lang : lang.code}
                  >
                    {typeof lang === 'string' ? lang : lang.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <Button
              color="primary"
              variant="flat"
              onPress={handleAddPreset}
              size="lg"
              className="w-full"
            >
              Add Preset
            </Button>
          </div>

          <div className="space-y-3">
            {translationPresets.map((preset) => (
              <Card key={preset.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{preset.shortcut}</div>
                    <div className="text-sm text-default-500">
                      {preset.sourceLang} → {preset.targetLang}
                    </div>
                  </div>
                  <Button
                    isIconOnly
                    color="danger"
                    variant="light"
                    onPress={() => handleRemovePreset(preset.id)}
                    size="sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderDisplaySettings = () => (
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
          className="w-full"
        >
          <SelectItem key="light" value="light">Light</SelectItem>
          <SelectItem key="dark" value="dark">Dark</SelectItem>
          <SelectItem key="system" value="system">System</SelectItem>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Display Options</h3>
          <div className="h-px flex-1 bg-default-100"></div>
        </div>
        <div className="space-y-4">
          <Select
            label="Default Source Language"
            selectedKeys={[newPresetSourceLang]}
            onChange={(e) => setNewPresetSourceLang(e.target.value)}
            size="lg"
            variant="bordered"
            classNames={{
              trigger: "h-12",
              value: "text-base",
              label: "text-default-500"
            }}
          >
            {(translationService === 'deepl' ? deeplLanguages : ["auto-detect", ...languages]).map((lang) => (
              <SelectItem 
                key={typeof lang === 'string' ? lang : lang.code} 
                value={typeof lang === 'string' ? lang : lang.code}
              >
                {typeof lang === 'string' ? lang : lang.name}
              </SelectItem>
            ))}
          </Select>

          <Select
            label="Default Target Language"
            selectedKeys={[newPresetTargetLang]}
            onChange={(e) => setNewPresetTargetLang(e.target.value)}
            size="lg"
            variant="bordered"
            classNames={{
              trigger: "h-12",
              value: "text-base",
              label: "text-default-500"
            }}
          >
            {(translationService === 'deepl' ? deeplLanguages.filter(lang => lang.code !== 'auto-detect') : languages).map((lang) => (
              <SelectItem 
                key={typeof lang === 'string' ? lang : lang.code} 
                value={typeof lang === 'string' ? lang : lang.code}
              >
                {typeof lang === 'string' ? lang : lang.name}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>
    </div>
  )

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      classNames={{
        base: `${isMobile ? "settings-modal-mobile" : ""} max-h-[90vh] min-w-[280px]`,
        wrapper: isMobile ? "items-start !m-0" : "items-center",
        backdrop: isMobile ? "!bg-background" : "",
        body: "p-0",
        header: "border-b border-default-100",
        footer: "border-t border-default-100 p-2",
      }}
      size={isMobile ? "full" : "2xl"}
      hideCloseButton={isMobile}
      scrollBehavior="inside"
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
                <h2 className="text-xl font-bold">Settings</h2>
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
            <ModalBody>
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto px-3 md:px-6">
                  <div className="settings-content py-2 md:py-4">
                    <Tabs 
                      selectedKey={selectedTab}
                      onSelectionChange={(key) => setSelectedTab(key.toString())}
                      aria-label="Settings tabs"
                      variant="light"
                      classNames={{
                        tabList: "settings-tab-list sticky top-0 bg-background/80 backdrop-blur-sm z-10",
                        cursor: "w-full",
                        tab: "settings-tab-button",
                        tabContent: "group-data-[selected=true]:text-primary"
                      }}
                    >
                      <Tab 
                        key="service" 
                        title={
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                              <path d="M12 6v6l4 2"/>
                            </svg>
                            <span className="settings-tab-text">Service</span>
                          </div>
                        }
                      >
                        {renderServiceSettings()}
                      </Tab>
                      <Tab 
                        key="shortcuts" 
                        title={
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            <span className="settings-tab-text">Shortcuts</span>
                          </div>
                        }
                      >
                        {renderShortcutsAndPresets()}
                      </Tab>
                      <Tab 
                        key="display" 
                        title={
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                            </svg>
                            <span className="settings-tab-text">Display</span>
                          </div>
                        }
                      >
                        {renderDisplaySettings()}
                      </Tab>
                    </Tabs>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 p-2 bg-background/80 backdrop-blur-sm sticky bottom-0">
                  <Button 
                    color="danger" 
                    variant="flat" 
                    onPress={handleRestoreDefaults}
                    size={isMobile ? "sm" : "lg"}
                    className="flex-1 md:flex-none font-medium"
                  >
                    Restore
                  </Button>
                  <Button 
                    color="default" 
                    variant="light" 
                    onPress={onClose}
                    size={isMobile ? "sm" : "lg"}
                    className="flex-1 md:flex-none font-medium"
                  >
                    Cancel
                  </Button>
                  <Button 
                    color="primary" 
                    onPress={handleSave}
                    size={isMobile ? "sm" : "lg"}
                    className="flex-1 md:flex-none font-medium"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
