import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Settings, User, Phone, Mail } from "lucide-react";
import { useState } from "react";
import type { ContactInfo } from "@shared/schema";

interface QuoteHeaderProps {
  quoteSubject: string;
  customerCompany: string;
  customerLogo?: string;
  salesPersonName: string;
  date: string;
  version: string;
  paymentTerms: string;
  currency: string;
  bomEnabled: boolean;
  costsEnabled: boolean;
  contactInfo: ContactInfo;
  onQuoteSubjectChange: (value: string) => void;
  onCustomerCompanyChange: (value: string) => void;
  onCustomerLogoChange: (file: File | null) => void;
  onSalesPersonChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onVersionChange: (value: string) => void;
  onPaymentTermsChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onBomEnabledChange: (enabled: boolean) => void;
  onCostsEnabledChange: (enabled: boolean) => void;
  onContactInfoChange: (contactInfo: ContactInfo) => void;
}

export default function QuoteHeader({
  quoteSubject,
  customerCompany,
  customerLogo,
  salesPersonName,
  date,
  version,
  paymentTerms,
  currency,
  bomEnabled,
  costsEnabled,
  contactInfo,
  onQuoteSubjectChange,
  onCustomerCompanyChange,
  onCustomerLogoChange,
  onSalesPersonChange,
  onDateChange,
  onVersionChange,
  onPaymentTermsChange,
  onCurrencyChange,
  onBomEnabledChange,
  onCostsEnabledChange,
  onContactInfoChange,
}: QuoteHeaderProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCustomerLogoChange(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onCustomerLogoChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const removeLogo = () => {
    onCustomerLogoChange(null);
  };

  return (
    <Card data-testid="card-quote-header">
      <CardHeader>
        <CardTitle>Quote Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quote-subject">Quote Subject</Label>
            <Input
              id="quote-subject"
              data-testid="input-quote-subject"
              placeholder="e.g., Cisco Catalyst Switch 9300 48-port PoE+"
              value={quoteSubject}
              onChange={(e) => onQuoteSubjectChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-company">Customer Company</Label>
            <Input
              id="customer-company"
              data-testid="input-customer-company"
              placeholder="Customer company name"
              value={customerCompany}
              onChange={(e) => onCustomerCompanyChange(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Customer Logo</Label>
          {customerLogo ? (
            <div className="relative inline-block">
              <img
                src={customerLogo}
                alt="Customer logo"
                className="h-16 w-auto border rounded-md"
                data-testid="img-customer-logo"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={removeLogo}
                data-testid="button-remove-logo"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              data-testid="area-logo-upload"
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag and drop logo here, or{' '}
                <label className="text-primary cursor-pointer hover:underline">
                  browse files
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    data-testid="input-logo-file"
                  />
                </label>
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sales-person">Sales Person</Label>
            <Select value={salesPersonName} onValueChange={onSalesPersonChange}>
              <SelectTrigger data-testid="select-sales-person">
                <SelectValue placeholder="Select sales person" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="David Gilboa">David Gilboa</SelectItem>
                <SelectItem value="Sarah Cohen">Sarah Cohen</SelectItem>
                <SelectItem value="Michael Levi">Michael Levi</SelectItem>
                <SelectItem value="Rachel Ben-David">Rachel Ben-David</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-date">Date</Label>
            <Input
              id="quote-date"
              type="date"
              data-testid="input-quote-date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              data-testid="input-version"
              placeholder="1"
              value={version}
              onChange={(e) => onVersionChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={onCurrencyChange}>
              <SelectTrigger data-testid="select-currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="NIS">NIS (₪)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="payment-terms">Payment Terms</Label>
            <Select value={paymentTerms} onValueChange={onPaymentTermsChange}>
              <SelectTrigger data-testid="select-payment-terms">
                <SelectValue placeholder="Select payment terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Current +30">Current +30</SelectItem>
                <SelectItem value="Current +60">Current +60</SelectItem>
                <SelectItem value="Cash on Delivery">Cash on Delivery</SelectItem>
                <SelectItem value="Net 15">Net 15</SelectItem>
                <SelectItem value="Net 30">Net 30</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Section Toggles</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="bom-enabled"
                  checked={bomEnabled}
                  onCheckedChange={onBomEnabledChange}
                  data-testid="switch-bom-section"
                />
                <Label htmlFor="bom-enabled" className="text-sm">BOM Section</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="costs-enabled"
                  checked={costsEnabled}
                  onCheckedChange={onCostsEnabledChange}
                  data-testid="switch-costs-section"
                />
                <Label htmlFor="costs-enabled" className="text-sm">Costs Section</Label>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Sales Person Name</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact-name"
                    data-testid="input-contact-name"
                    placeholder="Sales person name"
                    value={contactInfo.salesPersonName}
                    onChange={(e) => onContactInfoChange({ ...contactInfo, salesPersonName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact-phone"
                    data-testid="input-contact-phone"
                    placeholder="Phone number"
                    value={contactInfo.phone}
                    onChange={(e) => onContactInfoChange({ ...contactInfo, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact-email"
                    type="email"
                    data-testid="input-contact-email"
                    placeholder="Email address"
                    value={contactInfo.email}
                    onChange={(e) => onContactInfoChange({ ...contactInfo, email: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}