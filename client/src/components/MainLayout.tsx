import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Moon, Sun, Save, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MainLayoutProps {
  inputPanel: React.ReactNode;
  previewPanel: React.ReactNode;
  onSave?: () => void;
  quoteManagementElements?: React.ReactNode;
  currentQuoteBadge?: React.ReactNode;
}

export default function MainLayout({ inputPanel, previewPanel, onSave, quoteManagementElements, currentQuoteBadge }: MainLayoutProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    console.log(`Dark mode ${newMode ? 'enabled' : 'disabled'}`);
  };

  const handleSave = () => {
    onSave?.();
    toast({
      title: "Quote Saved",
      description: "Your quote has been saved successfully.",
    });
    console.log('Quote saved');
  };

  return (
    <div className="min-h-screen bg-background" data-testid="layout-main">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">MoonQuote</h1>
            </div>
            <div className="text-sm text-muted-foreground">
              EMET Dorcom Quote Generator
            </div>
            {currentQuoteBadge && (
              <div className="flex items-center">
                {currentQuoteBadge}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Quote Management Buttons */}
            {quoteManagementElements && (
              <div className="flex items-center space-x-2 mr-2">
                {quoteManagementElements}
              </div>
            )}
            
            {/* Legacy Save Button - hidden when quote management is available */}
            {!quoteManagementElements && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                data-testid="button-save-quote"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              data-testid="button-theme-toggle"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {isMobile ? (
          // Mobile: Tabbed interface
          <Tabs defaultValue="edit" className="h-[calc(100vh-73px)]" data-testid="tabs-mobile">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit" data-testid="tab-edit">Edit</TabsTrigger>
              <TabsTrigger value="preview" data-testid="tab-preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="h-full mt-0">
              <div className="h-full overflow-auto p-4">
                {inputPanel}
              </div>
            </TabsContent>
            <TabsContent value="preview" className="h-full mt-0">
              <div className="h-full">
                {previewPanel}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          // Desktop: Split-screen interface
          <div className="flex h-[calc(100vh-73px)]" data-testid="layout-split-screen">
            {/* Input Panel - 40% width */}
            <div className="w-2/5 border-r bg-muted/30 overflow-auto" data-testid="panel-input">
              <div className="p-6">
                {inputPanel}
              </div>
            </div>
            
            {/* Preview Panel - 60% width */}
            <div className="w-3/5 bg-background" data-testid="panel-preview">
              {previewPanel}
            </div>
          </div>
        )}
      </main>

      {/* Status Bar */}
      <div className="border-t bg-muted/30 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>Ready</span>
            <span>•</span>
            <span data-testid="text-sync-status">Live Preview Active</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Real-time sync enabled</span>
            <span>•</span>
            <span>{isMobile ? 'Mobile View' : 'Desktop View'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}