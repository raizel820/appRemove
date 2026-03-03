"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, Settings, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SpecDefinition {
  id: string;
  code: string;
  type: string;
  unit: string | null;
  labelEn: string | null;
  labelFr: string | null;
  labelAr: string | null;
  descriptionEn: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  category: string | null;
  options: string[] | null;
  required: boolean;
  minValue: number | null;
  maxValue: number | null;
  isActive: boolean;
  sortOrder: number;
}

interface SpecFormData {
  code: string;
  type: string;
  unit: string;
  category: string;
  labelEn: string;
  labelFr: string;
  labelAr: string;
  descriptionEn: string;
  descriptionFr: string;
  descriptionAr: string;
}

const SPEC_TYPES = [
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean (Yes/No)" },
];

const SPEC_CATEGORIES = [
  { value: "mechanical", label: "Mechanical" },
  { value: "electrical", label: "Electrical" },
  { value: "physical", label: "Physical" },
  { value: "performance", label: "Performance" },
  { value: "safety", label: "Safety" },
  { value: "other", label: "Other" },
];

const INITIAL_FORM: SpecFormData = {
  code: "",
  type: "number",
  unit: "",
  category: "",
  labelEn: "",
  labelFr: "",
  labelAr: "",
  descriptionEn: "",
  descriptionFr: "",
  descriptionAr: "",
};

interface SpecManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpecsChanged?: () => void; // Callback to notify parent of spec changes
}

export default function SpecManagementDialog({
  open,
  onOpenChange,
  onSpecsChanged,
}: SpecManagementDialogProps) {
  const { toast } = useToast();
  const [specs, setSpecs] = useState<SpecDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<SpecDefinition | null>(null);
  const [formData, setFormData] = useState<SpecFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Fetch specs on mount
  useEffect(() => {
    if (open) {
      fetchSpecs();
    }
  }, [open]);

  const fetchSpecs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/spec-definitions");
      if (response.ok) {
        const data = await response.json();
        setSpecs(data.specs || []);
      }
    } catch (error) {
      console.error("Error fetching specs:", error);
      toast({
        title: "Error",
        description: "Failed to load specifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSpec(null);
    setFormData(INITIAL_FORM);
    setIsFormOpen(true);
  };

  const handleEdit = (spec: SpecDefinition) => {
    setEditingSpec(spec);
    setFormData({
      code: spec.code,
      type: spec.type,
      unit: spec.unit || "",
      category: spec.category || "",
      labelEn: spec.labelEn || "",
      labelFr: spec.labelFr || "",
      labelAr: spec.labelAr || "",
      descriptionEn: spec.descriptionEn || "",
      descriptionFr: spec.descriptionFr || "",
      descriptionAr: spec.descriptionAr || "",
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this specification?")) return;

    try {
      const response = await fetch(`/api/spec-definitions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Specification deleted successfully",
        });
        fetchSpecs();
        onSpecsChanged?.(); // Notify parent to refresh specs
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete specification",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code) {
      toast({
        title: "Error",
        description: "Code is required",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const url = editingSpec
        ? `/api/spec-definitions/${editingSpec.id}`
        : "/api/spec-definitions";
      const method = editingSpec ? "PUT" : "POST";

      const payload: any = {
        code: formData.code,
        type: formData.type,
        unit: formData.unit || null,
        category: formData.category || null,
        labelEn: formData.labelEn || null,
        labelFr: formData.labelFr || null,
        labelAr: formData.labelAr || null,
        descriptionEn: formData.descriptionEn || null,
        descriptionFr: formData.descriptionFr || null,
        descriptionAr: formData.descriptionAr || null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: editingSpec
            ? "Specification updated successfully"
            : "Specification created successfully",
        });
        setIsFormOpen(false);
        setFormData(INITIAL_FORM);
        setEditingSpec(null);
        fetchSpecs();
        onSpecsChanged?.(); // Notify parent to refresh specs
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to save specification");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save specification",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSpecs = specs.filter((spec) => {
    const matchesSearch =
      spec.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (spec.labelEn?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (spec.labelFr?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (spec.labelAr?.includes(searchQuery));

    const matchesCategory =
      categoryFilter === "all" || spec.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !sm:max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Specification Management
          </DialogTitle>
          <DialogDescription>
            Create and manage specifications with translations in multiple languages
          </DialogDescription>
        </DialogHeader>

        {!isFormOpen ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code or label..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {SPEC_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Spec
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Label (EN)</TableHead>
                    <TableHead>Label (FR)</TableHead>
                    <TableHead>Label (AR)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredSpecs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchQuery || categoryFilter !== "all"
                          ? "No specifications found"
                          : "No specifications yet. Create your first specification!"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSpecs.map((spec) => (
                      <TableRow key={spec.id}>
                        <TableCell className="font-medium">{spec.code}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{spec.type}</Badge>
                        </TableCell>
                        <TableCell>{spec.unit || "-"}</TableCell>
                        <TableCell>
                          {spec.category && (
                            <Badge variant="secondary">{spec.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{spec.labelEn || "-"}</TableCell>
                        <TableCell>{spec.labelFr || "-"}</TableCell>
                        <TableCell className="font-arabic">{spec.labelAr || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(spec)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(spec.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="text-sm text-muted-foreground">
              Total: {filteredSpecs.length} specifications
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingSpec ? "Edit Specification" : "Create New Specification"}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Basic Information (All Optional)
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="spec-code">Spec Code</Label>
                    <Input
                      id="spec-code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g., RPM, VOLTAGE"
                    />
                  </div>
                  <div>
                    <Label htmlFor="spec-unit">Unit</Label>
                    <Input
                      id="spec-unit"
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                      placeholder="e.g., rpm, V, kg, mm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="spec-type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger id="spec-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPEC_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="spec-category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger id="spec-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPEC_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Translations */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Translations
                </h4>

                <Tabs defaultValue="en" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="fr">Français</TabsTrigger>
                    <TabsTrigger value="ar">العربية</TabsTrigger>
                  </TabsList>

                  <TabsContent value="en" className="space-y-4">
                    <div>
                      <Label htmlFor="label-en">Label (English)</Label>
                      <Input
                        id="label-en"
                        value={formData.labelEn}
                        onChange={(e) =>
                          setFormData({ ...formData, labelEn: e.target.value })
                        }
                        placeholder="e.g., Rotational Speed"
                      />
                    </div>
                    <div>
                      <Label htmlFor="desc-en">Description (English)</Label>
                      <textarea
                        id="desc-en"
                        value={formData.descriptionEn}
                        onChange={(e) =>
                          setFormData({ ...formData, descriptionEn: e.target.value })
                        }
                        placeholder="Enter a description..."
                        rows={3}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="fr" className="space-y-4">
                    <div>
                      <Label htmlFor="label-fr">Label (Français)</Label>
                      <Input
                        id="label-fr"
                        value={formData.labelFr}
                        onChange={(e) =>
                          setFormData({ ...formData, labelFr: e.target.value })
                        }
                        placeholder="e.g., Vitesse de rotation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="desc-fr">Description (Français)</Label>
                      <textarea
                        id="desc-fr"
                        value={formData.descriptionFr}
                        onChange={(e) =>
                          setFormData({ ...formData, descriptionFr: e.target.value })
                        }
                        placeholder="Entrez une description..."
                        rows={3}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="ar" className="space-y-4">
                    <div>
                      <Label htmlFor="label-ar">Label (العربية)</Label>
                      <Input
                        id="label-ar"
                        value={formData.labelAr}
                        onChange={(e) =>
                          setFormData({ ...formData, labelAr: e.target.value })
                        }
                        placeholder="مثال: سرعة الدوران"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="desc-ar">Description (العربية)</Label>
                      <textarea
                        id="desc-ar"
                        value={formData.descriptionAr}
                        onChange={(e) =>
                          setFormData({ ...formData, descriptionAr: e.target.value })
                        }
                        placeholder="أدخل الوصف..."
                        rows={3}
                        dir="rtl"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingSpec ? "Update" : "Create"} Specification
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
