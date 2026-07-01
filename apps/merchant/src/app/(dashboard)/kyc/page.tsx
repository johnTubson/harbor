"use client";

import type { KycDocumentType } from "@harbor/shared";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MerchantStatusBadge,
  PageContainer,
  PageHeader,
  toast,
} from "@harbor/ui";
import { useRef, useState } from "react";
import {
  useKycUploadUrl,
  useMerchantProfile,
  useRegisterKycDocument,
} from "@/lib/hooks";

const documentTypes: { type: KycDocumentType; label: string }[] = [
  { type: "business_license", label: "Business license" },
  { type: "government_id", label: "Government ID" },
  { type: "tax_certificate", label: "Tax certificate" },
];

export default function KycPage() {
  const { data: merchant, isLoading, error } = useMerchantProfile();
  const uploadUrl = useKycUploadUrl();
  const registerDoc = useRegisterKycDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<KycDocumentType | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<KycDocumentType | null>(
    null
  );

  function openFilePicker(type: KycDocumentType) {
    setSelectedType(type);
    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const type = selectedType;
    event.target.value = "";
    if (!file || !type) return;

    setUploadingType(type);
    setUploadError(null);

    try {
      const presigned = await uploadUrl.mutateAsync({
        type,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });

      const putResponse = await fetch(presigned.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!putResponse.ok) {
        throw new Error("Upload to storage failed");
      }

      await registerDoc.mutateAsync({
        type,
        objectKey: presigned.objectKey,
        fileName: file.name,
      });

      toast.success(`${file.name} uploaded`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingType(null);
      setSelectedType(null);
    }
  }

  if (isLoading) {
    return (
      <PageContainer size="md">
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </PageContainer>
    );
  }

  if (error || !merchant) {
    return (
      <PageContainer size="md">
        <p className="text-sm text-destructive">
          Could not load merchant profile.
        </p>
      </PageContainer>
    );
  }

  const uploadedTypes = new Set(merchant.kycDocuments.map((doc) => doc.type));

  return (
    <PageContainer size="md">
      <PageHeader
        title="KYC documents"
        description="Upload verification documents for platform review."
      />

      <div className="mt-4 flex items-center gap-3">
        <MerchantStatusBadge status={merchant.status} />
        {merchant.status === "active" ? (
          <p className="text-sm text-muted-foreground">
            Your account is active — documents are read-only.
          </p>
        ) : null}
      </div>

      {uploadError ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileChange}
      />

      <section className="mt-8 space-y-4">
        {documentTypes.map(({ type, label }) => {
          const existing = merchant.kycDocuments.find(
            (doc) => doc.type === type
          );
          const isUploading = uploadingType === type;

          return (
            <Card key={type}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                {existing ? (
                  <div>
                    <p className="text-sm font-medium">{existing.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded{" "}
                      {new Date(existing.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not uploaded</p>
                )}
                <Button
                  variant={existing ? "outline" : "default"}
                  disabled={
                    merchant.status === "active" ||
                    Boolean(existing) ||
                    isUploading
                  }
                  onClick={() => openFilePicker(type)}
                >
                  {isUploading
                    ? "Uploading…"
                    : existing
                    ? "Uploaded"
                    : "Upload file"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </PageContainer>
  );
}
