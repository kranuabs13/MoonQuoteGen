import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Image, Palette, FileText, Save, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TemplateSettings, defaultTemplateSettings } from "@shared/schema";

// Form validation schema
const settingsFormSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  companyLogo: z.string().optional(),
  frameColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Frame color must be a valid hex color"),
  introText: z.string().min(1, "Intro text is required"),
  introImage: z.string().optional(),
  tableHeaderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Table header color must be a valid hex color"),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast();
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string>("");
  const [introImagePreview, setIntroImagePreview] = useState<string>("");

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery<TemplateSettings>({
    queryKey: ['/api/settings'],
    enabled: open, // Only fetch when dialog is open
  });

  // Form with default values
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      templateId: defaultTemplateSettings.templateId,
      frameColor: defaultTemplateSettings.frameColor,
      introText: defaultTemplateSettings.introText,
      tableHeaderColor: defaultTemplateSettings.tableHeaderColor,
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (currentSettings) {
      form.reset(currentSettings);
      setCompanyLogoPreview(currentSettings.companyLogo || "");
      setIntroImagePreview(currentSettings.introImage || "");
    }
  }, [currentSettings, form]);

  // Settings update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const response = await apiRequest('PUT', '/api/settings', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Template settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle image upload (similar to customer logo upload)
  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>, 
    type: 'companyLogo' | 'introImage'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please choose an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      if (type === 'companyLogo') {
        form.setValue('companyLogo', base64String);
        setCompanyLogoPreview(base64String);
      } else {
        form.setValue('introImage', base64String);
        setIntroImagePreview(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove image
  const removeImage = (type: 'companyLogo' | 'introImage') => {
    if (type === 'companyLogo') {
      form.setValue('companyLogo', '');
      setCompanyLogoPreview('');
    } else {
      form.setValue('introImage', '');
      setIntroImagePreview('');
    }
  };

  const onSubmit = (data: SettingsFormData) => {
    updateSettingsMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Template Settings
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="branding" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="branding" data-testid="tab-branding">
                  <Image className="h-4 w-4 mr-2" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="colors" data-testid="tab-colors">
                  <Palette className="h-4 w-4 mr-2" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="content" data-testid="tab-content">
                  <FileText className="h-4 w-4 mr-2" />
                  Content
                </TabsTrigger>
              </TabsList>

              {/* Branding Tab */}
              <TabsContent value="branding" className="space-y-4">
                {/* Company Logo */}
                <Card>
                  <CardContent className="pt-6">
                    <FormLabel className="text-base font-medium">Company Logo</FormLabel>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload your company logo to appear on quotes (recommended: 200x60px, max 5MB)
                    </p>
                    
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'companyLogo')}
                          data-testid="input-company-logo"
                          disabled={updateSettingsMutation.isPending}
                        />
                      </div>
                      
                      {companyLogoPreview && (
                        <div className="relative">
                          <img
                            src={companyLogoPreview}
                            alt="Company Logo Preview"
                            className="h-16 w-auto max-w-32 object-contain border rounded"
                            data-testid="preview-company-logo"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => removeImage('companyLogo')}
                            data-testid="button-remove-company-logo"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Intro Image/Diagram */}
                <Card>
                  <CardContent className="pt-6">
                    <FormLabel className="text-base font-medium">Page 2 Diagram</FormLabel>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload a diagram or image to appear on page 2 of quotes (max 5MB)
                    </p>
                    
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'introImage')}
                          data-testid="input-intro-image"
                          disabled={updateSettingsMutation.isPending}
                        />
                      </div>
                      
                      {introImagePreview && (
                        <div className="relative">
                          <img
                            src={introImagePreview}
                            alt="Intro Image Preview"
                            className="h-16 w-auto max-w-32 object-contain border rounded"
                            data-testid="preview-intro-image"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => removeImage('introImage')}
                            data-testid="button-remove-intro-image"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Colors Tab */}
              <TabsContent value="colors" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="frameColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frame Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              {...field}
                              className="w-16 h-10 p-1 border rounded"
                              data-testid="input-frame-color"
                              disabled={updateSettingsMutation.isPending}
                            />
                            <Input
                              type="text"
                              {...field}
                              placeholder="#1f2937"
                              className="flex-1"
                              data-testid="input-frame-color-text"
                              disabled={updateSettingsMutation.isPending}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tableHeaderColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Header Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              {...field}
                              className="w-16 h-10 p-1 border rounded"
                              data-testid="input-table-header-color"
                              disabled={updateSettingsMutation.isPending}
                            />
                            <Input
                              type="text"
                              {...field}
                              placeholder="#f3f4f6"
                              className="flex-1"
                              data-testid="input-table-header-color-text"
                              disabled={updateSettingsMutation.isPending}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-4">
                <FormField
                  control={form.control}
                  name="introText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Introduction Text</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="This quote outlines the proposed solution for your requirements..."
                          className="min-h-32"
                          data-testid="input-intro-text"
                          disabled={updateSettingsMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-settings"
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending || isLoading}
                data-testid="button-save-settings"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}