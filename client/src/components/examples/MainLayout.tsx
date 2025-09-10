import MainLayout from '../MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MainLayoutExample() {
  const sampleInputPanel = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sample Input Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is where the quote input forms would go. In the actual application, 
            this would contain the QuoteHeader, BomSection, and CostSection components.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const samplePreviewPanel = (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Sample Preview Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This is where the live quote preview would appear. The preview updates 
          in real-time as users make changes in the input panel.
        </p>
      </CardContent>
    </Card>
  );

  const handleSave = () => {
    console.log('Save action triggered from layout');
  };

  return (
    <MainLayout
      inputPanel={sampleInputPanel}
      previewPanel={samplePreviewPanel}
      onSave={handleSave}
    />
  );
}