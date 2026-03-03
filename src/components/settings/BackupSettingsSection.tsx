"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Download,
  Upload,
  Trash2,
  Database,
  FileJson,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Calendar,
  Package,
  Settings,
  FileText,
  Hash,
  History,
  RotateCcw,
  AlertOctagon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { format } from "date-fns";

// Data type categories
const DATA_CATEGORIES = {
  settings: { name: "Settings", icon: Settings },
  business: { name: "Business Data", icon: Package },
  orders: { name: "Orders & Documents", icon: FileText },
  numbers: { name: "Number Management", icon: Hash },
  audit: { name: "Audit & Logs", icon: History },
  files: { name: "File Management", icon: Database },
};

// Data types by category
const DATA_TYPES_BY_CATEGORY = {
  settings: [
    { key: "company", name: "Company Info" },
    { key: "companyProfiles", name: "Activity Profiles" },
    { key: "companyLogos", name: "Company Logos", description: "Includes logo image files" },
    { key: "pdfConfiguration", name: "PDF Configuration" },
    { key: "qrCodeSettings", name: "QR Code Settings" },
  ],
  business: [
    { key: "customers", name: "Customers" },
    { key: "machineFamilies", name: "Machine Families" },
    { key: "machineModels", name: "Machine Models" },
    { key: "specTemplates", name: "Spec Templates" },
    { key: "specDefinitions", name: "Spec Definitions" },
    { key: "modelSpecs", name: "Model Specs" },
  ],
  orders: [
    { key: "orders", name: "Orders" },
    { key: "orderItems", name: "Order Items" },
    { key: "documentSplits", name: "Document Splits" },
  ],
  numbers: [
    { key: "orderNumbers", name: "Order Numbers" },
    { key: "orderNumbersYear", name: "Order Numbers (Year)" },
    { key: "invoiceNumbers", name: "Invoice Numbers" },
    { key: "proformaNumbers", name: "Proforma Numbers" },
    { key: "purchaseOrderNumbers", name: "Purchase Order Numbers" },
    { key: "deliveryNumbers", name: "Delivery Numbers" },
    { key: "serialNumberCounter", name: "Serial Number Counters" },
  ],
  audit: [
    { key: "auditLogs", name: "Audit Logs" },
    { key: "customerSearch", name: "Customer Search Index" },
    { key: "orderSearch", name: "Order Search Index" },
    { key: "serialSearch", name: "Serial Search Index" },
  ],
  files: [
    { key: "files", name: "Files" },
    { key: "fileSequences", name: "File Sequences" },
    { key: "fileRevisions", name: "File Revisions" },
    { key: "verificationTokens", name: "Verification Tokens" },
  ],
};

interface DataTypeStats {
  [key: string]: { count: number };
}

interface Backup {
  id: string;
  filename: string;
  description: string | null;
  fileSize: number;
  dataTypes: string[];
  dateFrom: string | null;
  dateTo: string | null;
  status: string;
  errorMessage: string | null;
  recordCount: number;
  createdAt: string;
}

interface OperationResult {
  success: boolean;
  message: string;
  details?: any;
}

export default function BackupSettingsSection() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dataTypeStats, setDataTypeStats] = useState<DataTypeStats>({});
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingBackups, setIsLoadingBackups] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<Backup | null>(null);
  const [operationResult, setOperationResult] = useState<OperationResult | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [resetBackupDialogOpen, setResetBackupDialogOpen] = useState(false);
  const [resetAppDialogOpen, setResetAppDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Fetch stats and backups on mount
  useEffect(() => {
    fetchStats();
    fetchBackups();
  }, []);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch("/api/backup/stats");
      if (response.ok) {
        const data = await response.json();
        setDataTypeStats(data.stats || {});
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const response = await fetch("/api/backup");
      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error("Error fetching backups:", error);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  // Select all data types
  const selectAll = () => {
    const allTypes = Object.values(DATA_TYPES_BY_CATEGORY)
      .flat()
      .map((t) => t.key);
    setSelectedDataTypes(allTypes);
  };

  // Deselect all data types
  const deselectAll = () => {
    setSelectedDataTypes([]);
  };

  // Toggle data type selection
  const toggleDataType = (key: string) => {
    setSelectedDataTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Select all in category
  const selectCategory = (category: string) => {
    const categoryTypes = DATA_TYPES_BY_CATEGORY[category as keyof typeof DATA_TYPES_BY_CATEGORY];
    const keys = categoryTypes.map((t) => t.key);
    setSelectedDataTypes((prev) => [...new Set([...prev, ...keys])]);
  };

  // Create backup
  const handleCreateBackup = async () => {
    if (selectedDataTypes.length === 0) {
      toast({
        title: t("error"),
        description: "Please select at least one data type",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    setOperationResult(null);

    try {
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          dataTypes: selectedDataTypes,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOperationResult({
          success: true,
          message: data.message || "Backup created successfully",
          details: data.backup,
        });
        toast({
          title: t("success"),
          description: `Backup created with ${data.backup.recordCount} records`,
        });
        setDescription("");
        setDateFrom("");
        setDateTo("");
        fetchBackups();
      } else {
        throw new Error(data.error || "Failed to create backup");
      }
    } catch (error: any) {
      setOperationResult({
        success: false,
        message: error.message || "Failed to create backup",
      });
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Download backup
  const handleDownloadBackup = async (backup: Backup) => {
    try {
      const response = await fetch(`/api/backup/${backup.id}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = backup.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast({
          title: t("success"),
          description: "Backup downloaded successfully",
        });
      } else {
        throw new Error("Failed to download backup");
      }
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Delete backup
  const handleDeleteBackup = async () => {
    if (!backupToDelete) return;

    try {
      const response = await fetch(`/api/backup/${backupToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: t("success"),
          description: "Backup deleted successfully",
        });
        fetchBackups();
      } else {
        throw new Error("Failed to delete backup");
      }
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setBackupToDelete(null);
    }
  };

  // Handle file selection for restore
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);

    // Validate file
    try {
      const content = await file.text();
      const response = await fetch("/api/backup/restore", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();
      if (data.success && data.valid) {
        setRestorePreview(data);
        toast({
          title: t("success"),
          description: "Backup file validated successfully",
        });
      } else {
        throw new Error(data.error || "Invalid backup file");
      }
    } catch (error: any) {
      setRestoreFile(null);
      setRestorePreview(null);
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Restore from backup
  const handleRestore = async () => {
    if (!restoreFile) return;

    setIsRestoring(true);
    setOperationResult(null);

    try {
      const content = await restoreFile.text();
      const backupData = JSON.parse(content);

      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupData,
          overwrite: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOperationResult({
          success: true,
          message: data.message,
          details: data.details,
        });
        toast({
          title: t("success"),
          description: "Data restored successfully",
        });
        // Refresh stats
        fetchStats();
      } else {
        throw new Error(data.error || "Failed to restore backup");
      }
    } catch (error: any) {
      setOperationResult({
        success: false,
        message: error.message,
      });
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
      setRestoreDialogOpen(false);
      setRestoreFile(null);
      setRestorePreview(null);
    }
  };

  // Reset backup system
  const handleResetBackupSystem = async () => {
    setIsResetting(true);
    setOperationResult(null);

    try {
      const response = await fetch("/api/backup/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetBackupSystem" }),
      });

      const data = await response.json();

      if (data.success) {
        setOperationResult({
          success: true,
          message: data.message,
          details: data.details,
        });
        toast({
          title: t("success"),
          description: "Backup system reset successfully",
        });
        fetchBackups();
      } else {
        throw new Error(data.message || "Failed to reset backup system");
      }
    } catch (error: any) {
      setOperationResult({
        success: false,
        message: error.message,
      });
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
      setResetBackupDialogOpen(false);
    }
  };

  // Reset whole app
  const handleResetApp = async () => {
    setIsResetting(true);
    setOperationResult(null);

    try {
      const response = await fetch("/api/backup/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetApp" }),
      });

      const data = await response.json();

      if (data.success) {
        setOperationResult({
          success: true,
          message: data.message,
          details: data.details,
        });
        toast({
          title: t("success"),
          description: "App reset successfully",
        });
        fetchStats();
        fetchBackups();
      } else {
        throw new Error(data.message || "Failed to reset app");
      }
    } catch (error: any) {
      setOperationResult({
        success: false,
        message: error.message,
      });
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
      setResetAppDialogOpen(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-yellow-500 text-white">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500 text-white">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Operation Result Card */}
      {operationResult && (
        <Card
          className={
            operationResult.success
              ? "border-green-500 bg-green-50 dark:bg-green-950"
              : "border-red-500 bg-red-50 dark:bg-red-950"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              {operationResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {operationResult.success ? "Operation Successful" : "Operation Failed"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{operationResult.message}</p>
            {operationResult.details && (
              <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                {operationResult.details.recordCount !== undefined && (
                  <span>Records: {operationResult.details.recordCount}</span>
                )}
                {operationResult.details.logoFilesCount !== undefined && operationResult.details.logoFilesCount > 0 && (
                  <span>Logo Files: {operationResult.details.logoFilesCount}</span>
                )}
                {operationResult.details.fileSize !== undefined && (
                  <span>Size: {formatFileSize(operationResult.details.fileSize)}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Backup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Create Backup
          </CardTitle>
          <CardDescription>
            Select data types to include in your backup. You can also filter by date range.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for this backup..."
              rows={2}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Date From (optional)</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>Date To (optional)</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Data Type Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Select Data Types</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>

            {isLoadingStats ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(DATA_CATEGORIES).map(([categoryKey, categoryInfo]) => {
                  const categoryTypes =
                    DATA_TYPES_BY_CATEGORY[categoryKey as keyof typeof DATA_TYPES_BY_CATEGORY];
                  const Icon = categoryInfo.icon;

                  return (
                    <div
                      key={categoryKey}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 font-medium">
                          <Icon className="h-4 w-4" />
                          {categoryInfo.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => selectCategory(categoryKey)}
                        >
                          Select All
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {categoryTypes.map((type) => {
                          const count = dataTypeStats[type.key]?.count || 0;
                          const isSelected = selectedDataTypes.includes(type.key);

                          return (
                            <div
                              key={type.key}
                              className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:bg-muted"
                              }`}
                              onClick={() => toggleDataType(type.key)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleDataType(type.key)}
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium">
                                  {type.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {type.description ? (
                                    <span className="text-primary/70">{type.description}</span>
                                  ) : (
                                    `${count} records`
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleCreateBackup}
              disabled={isCreating || selectedDataTypes.length === 0}
              className="min-w-[150px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileJson className="h-4 w-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedDataTypes.length} data types selected
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Restore Backup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Restore Backup
          </CardTitle>
          <CardDescription>
            Upload a backup file to restore data. This will add data to the existing records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div>
            <Label>Backup File</Label>
            <Input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              disabled={isRestoring}
            />
          </div>

          {/* Restore Preview */}
          {restorePreview && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-2">Backup Preview</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Version:</span>{" "}
                  {restorePreview.summary?.version}
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  {restorePreview.summary?.createdAt
                    ? format(new Date(restorePreview.summary.createdAt), "PPpp")
                    : "N/A"}
                </div>
                <div>
                  <span className="text-muted-foreground">Records:</span>{" "}
                  {restorePreview.summary?.recordCount || 0}
                </div>
                <div>
                  <span className="text-muted-foreground">Data Types:</span>{" "}
                  {restorePreview.dataTypes?.length || 0}
                </div>
                {(restorePreview.summary?.logoFilesCount || 0) > 0 && (
                  <div>
                    <span className="text-muted-foreground">Logo Files:</span>{" "}
                    {restorePreview.summary?.logoFilesCount}
                  </div>
                )}
              </div>
              {restorePreview.summary?.description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {restorePreview.summary.description}
                </p>
              )}
            </div>
          )}

          {/* Restore Button */}
          <div className="flex gap-4">
            <Button
              variant="destructive"
              onClick={() => setRestoreDialogOpen(true)}
              disabled={!restoreFile || isRestoring}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restore Data
                </>
              )}
            </Button>
            {restoreFile && (
              <Button
                variant="outline"
                onClick={() => {
                  setRestoreFile(null);
                  setRestorePreview(null);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Backup History Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Backup History
              </CardTitle>
              <CardDescription>View and manage your backup files</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchBackups}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingBackups ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No backups found. Create your first backup above.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(backup.createdAt), "PP")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(backup.createdAt), "p")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {backup.description || backup.filename}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {backup.dataTypes.length} data types
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                      <TableCell>{backup.recordCount}</TableCell>
                      <TableCell>{getStatusBadge(backup.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadBackup(backup)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setBackupToDelete(backup);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this backup? This action cannot be undone.
              <div className="mt-2 text-sm font-medium">
                {backupToDelete?.filename}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBackup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Backup</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore data from the backup file. Existing records with the same IDs
              will be skipped. This action cannot be undone.
              {restorePreview && (
                <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                  <div>
                    <strong>Records to restore:</strong>{" "}
                    {restorePreview.summary?.recordCount || 0}
                  </div>
                  <div>
                    <strong>Data types:</strong>{" "}
                    {restorePreview.dataTypes?.map((d: any) => d.type).join(", ")}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset System Card */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertOctagon className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            These actions are irreversible. Please make sure you have a backup before proceeding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Reset Backup System Button */}
            <div className="flex-1 border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset Backup System
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Delete all backup files and records. This will clear the entire backup history.
              </p>
              <Button
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                onClick={() => setResetBackupDialogOpen(true)}
                disabled={isResetting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset Backup System
              </Button>
            </div>

            {/* Reset Whole App Button */}
            <div className="flex-1 border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Reset Whole App
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Delete all application data except backups. Default company settings will be restored.
              </p>
              <Button
                variant="destructive"
                onClick={() => setResetAppDialogOpen(true)}
                disabled={isResetting}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Reset Entire App
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Backup System Confirmation Dialog */}
      <AlertDialog open={resetBackupDialogOpen} onOpenChange={setResetBackupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Reset Backup System
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all backup files and records. This action cannot be undone.
              <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950 rounded-md text-sm text-orange-800 dark:text-orange-200">
                <strong>Warning:</strong> All backup history will be lost. You won't be able to recover any previous backups.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetBackupSystem}
              disabled={isResetting}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Backup System"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Whole App Confirmation Dialog */}
      <AlertDialog open={resetAppDialogOpen} onOpenChange={setResetAppDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-destructive" />
              Reset Entire Application
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL application data including:
              <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                <li>Company settings and profiles</li>
                <li>Customers and their data</li>
                <li>Machine families and models</li>
                <li>All orders and documents</li>
                <li>Number sequences</li>
                <li>Audit logs and search indexes</li>
              </ul>
              <div className="mt-4 p-3 bg-destructive/10 rounded-md text-sm text-destructive">
                <strong>Critical:</strong> This action cannot be undone. All data will be permanently deleted. Only backup files and records will be preserved.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetApp}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Entire App"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
