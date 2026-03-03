"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import SpecManagementDialog from "@/components/machines/SpecManagementDialog";
import { Plus, Search, Edit, Trash2, Package, FolderOpen, Settings, X, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import {
  CURRENCIES,
  getCurrencySymbol,
  convertPrice,
  type ExchangeRate,
} from "@/lib/currencyUtils";

interface MechanicalSpecs {
  rpmMin?: string | null;
  rpmMax?: string | null;
  powerKw?: string | null;
  torqueNm?: string | null;
  loadCapacityKg?: string | null;
  balancingCapacityKg?: string | null;
  shaftDiameterMm?: string | null;
  bearingType?: string | null;
  driveType?: string | null;
  gearboxRatio?: string | null;
  coolingMethod?: string | null;
  accuracyClass?: string | null;
  vibrationLimit?: string | null;
  runoutToleranceMm?: string | null;
  brakingSystem?: string | null;
  lubricationType?: string | null;
  dutyCycle?: string | null;
}

interface ElectricalSpecs {
  voltage?: string | null;
  phase?: string | null;
  frequencyHz?: string | null;
  powerConsumptionKw?: string | null;
  currentA?: string | null;
  motorType?: string | null;
  motorPowerKw?: string | null;
  motorSpeedRpm?: string | null;
  efficiencyClass?: string | null;
  protectionClass?: string | null;
  insulationClass?: string | null;
  controlSystem?: string | null;
  inverter?: string | null;
  plcBrand?: string | null;
  sensorTypes?: string[];
  emergencyStop?: boolean;
  safetyRelay?: string | null;
  groundingRequired?: boolean;
}

interface PhysicalSpecs {
  widthMm?: string | null;
  heightMm?: string | null;
  depthMm?: string | null;
  footprintMm?: string | null;
  weightKg?: string | null;
  frameMaterial?: string | null;
  enclosureMaterial?: string | null;
  surfaceFinish?: string | null;
  color?: string | null;
  noiseDb?: string | null;
  operatingTempC?: string | null;
  storageTempC?: string | null;
  humidityPercent?: string | null;
  installationType?: string | null;
  protectionRating?: string | null;
  transportMethod?: string | null;
}

interface MachineFamily {
  id: string;
  code: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface MachineModel {
  id: string;
  code: string;
  name: string;
  familyId: string;
  description?: string;
  basePrice?: number | null;
  currency?: string | null;
  isManufactured?: boolean;
  mechanicalSpecs?: MechanicalSpecs | null;
  electricalSpecs?: ElectricalSpecs | null;
  physicalSpecs?: PhysicalSpecs | null;
  family?: MachineFamily | null;
  createdAt?: string;
}

type FamilyForm = {
  code: string;
  name: string;
  description: string;
};

type ModelForm = {
  familyId: string;
  code: string;
  name: string;
  description: string;
  basePrice: string; // string in the form
  isManufactured: boolean;
  currency: string;
  mechanicalSpecs: MechanicalSpecs;
  electricalSpecs: ElectricalSpecs;
  physicalSpecs: PhysicalSpecs;
};

const FAMILY_FORM_INITIAL: FamilyForm = {
  code: "",
  name: "",
  description: "",
};

const MECH_SPECS_INITIAL: MechanicalSpecs = {
  rpmMin: null,
  rpmMax: null,
  powerKw: null,
  torqueNm: null,
  loadCapacityKg: null,
  balancingCapacityKg: null,
  shaftDiameterMm: null,
  bearingType: null,
  driveType: null,
  gearboxRatio: null,
  coolingMethod: null,
  accuracyClass: null,
  vibrationLimit: null,
  runoutToleranceMm: null,
  brakingSystem: null,
  lubricationType: null,
  dutyCycle: null,
};

const ELEC_SPECS_INITIAL: ElectricalSpecs = {
  voltage: null,
  phase: null,
  frequencyHz: null,
  powerConsumptionKw: null,
  currentA: null,
  motorType: null,
  motorPowerKw: null,
  motorSpeedRpm: null,
  efficiencyClass: null,
  protectionClass: null,
  insulationClass: null,
  controlSystem: null,
  inverter: null,
  plcBrand: null,
  sensorTypes: [],
  emergencyStop: true,
  safetyRelay: null,
  groundingRequired: true,
};

const PHYS_SPECS_INITIAL: PhysicalSpecs = {
  widthMm: null,
  heightMm: null,
  depthMm: null,
  footprintMm: null,
  weightKg: null,
  frameMaterial: null,
  enclosureMaterial: null,
  surfaceFinish: null,
  color: null,
  noiseDb: null,
  operatingTempC: null,
  storageTempC: null,
  humidityPercent: null,
  installationType: null,
  protectionRating: null,
  transportMethod: null,
};

const MODEL_FORM_INITIAL: ModelForm = {
  familyId: "",
  code: "",
  name: "",
  description: "",
  basePrice: "",
  isManufactured: true,
  currency: "EUR",
  mechanicalSpecs: MECH_SPECS_INITIAL,
  electricalSpecs: ELEC_SPECS_INITIAL,
  physicalSpecs: PHYS_SPECS_INITIAL,
};

export default function MachinesPage() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [families, setFamilies] = useState<MachineFamily[]>([]);
  const [models, setModels] = useState<MachineModel[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"families" | "models">("families");
  const [selectedCurrency, setSelectedCurrency] = useState("EUR");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);

  // Family dialog state
  const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [familyFormData, setFamilyFormData] = useState<FamilyForm>(FAMILY_FORM_INITIAL);

  // Model dialog state
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modelFormData, setModelFormData] = useState<ModelForm>(MODEL_FORM_INITIAL);
  const [modelStep, setModelStep] = useState<1 | 2>(1);

  // Spec templates state
  const [specTemplates, setSpecTemplates] = useState<any[]>([]);
  const [specDefinitions, setSpecDefinitions] = useState<any[]>([]);
  const [selectedSpecIds, setSelectedSpecIds] = useState<string[]>([]);

  // New spec selector state
  const [selectedSpecType, setSelectedSpecType] = useState<string>("");
  const [selectedSpecCategory, setSelectedSpecCategory] = useState<string>("");
  const [selectedSpecDefinitionId, setSelectedSpecDefinitionId] = useState<string>("");
  const [modelSpecs, setModelSpecs] = useState<Array<{ specDefinitionId: string; specDefinition: any; value: string }>>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [company, setCompany] = useState<{ currency: string } | null>(null);

  // Delete confirmation dialog state
  const [deleteFamilyDialogOpen, setDeleteFamilyDialogOpen] = useState(false);
  const [deleteModelDialogOpen, setDeleteModelDialogOpen] = useState(false);
  const [familyToDelete, setFamilyToDelete] = useState<{ id: string; name: string; modelsCount: number } | null>(null);
  const [modelToDelete, setModelToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteFamilyModels, setDeleteFamilyModels] = useState(false);

  // Spec management dialog state
  const [specManagementOpen, setSpecManagementOpen] = useState(false);

  // Model info dialog state
  const [modelInfoOpen, setModelInfoOpen] = useState(false);
  const [selectedModelForInfo, setSelectedModelForInfo] = useState<MachineModel | null>(null);
  const [selectedModelSpecs, setSelectedModelSpecs] = useState<any[]>([]);

  // On mount: fetch everything once
  useEffect(() => {
    fetchFamilies();
    fetchModels();
    fetchSpecTemplates();
    fetchSpecDefinitions();
    fetchCompanyAndRates();
  }, []);

  const fetchSpecTemplates = async () => {
    try {
      const response = await fetch("/api/spec-templates");
      if (response.ok) {
        const data = await response.json();
        setSpecTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Error fetching spec templates:", error);
    }
  };

  const fetchSpecDefinitions = async () => {
    try {
      const response = await fetch("/api/spec-definitions");
      if (response.ok) {
        const data = await response.json();
        setSpecDefinitions(data.specs || []);
      }
    } catch (error) {
      console.error("Error fetching spec definitions:", error);
    }
  };

  // Helper: Get unique spec types
  const getUniqueSpecTypes = () => {
    const types = specDefinitions.map(s => s.type).filter(Boolean);
    return Array.from(new Set(types)).sort();
  };

  // Helper: Get unique spec categories for selected type (or all categories if no type selected)
  const getCategoriesForType = (type: string) => {
    const specs = type 
      ? specDefinitions.filter(s => s.type && s.type.toLowerCase() === type.toLowerCase())
      : specDefinitions;
    const categories = specs.map(s => s.category).filter(Boolean);
    return Array.from(new Set(categories)).sort();
  };

  // Helper: Get specs for selected type and category
  const getSpecsForFilters = (type: string, category: string) => {
    return specDefinitions.filter(s => {
      if (type && (!s.type || s.type.toLowerCase() !== type.toLowerCase())) return false;
      if (category && (!s.category || s.category.toLowerCase() !== category.toLowerCase())) return false;
      return true;
    });
  };

  // Add spec to model
  const handleAddSpec = () => {
    if (!selectedSpecDefinitionId) return;

    const specDef = specDefinitions.find(s => s.id === selectedSpecDefinitionId);
    if (!specDef) return;

    // Check if spec is already added
    if (modelSpecs.find(ms => ms.specDefinitionId === selectedSpecDefinitionId)) {
      toast({
        title: "Warning",
        description: "This spec is already added to the model",
        variant: "destructive",
      });
      return;
    }

    setModelSpecs([...modelSpecs, {
      specDefinitionId: specDef.id,
      specDefinition: specDef,
      value: "",
    }]);

    // Reset selectors
    setSelectedSpecDefinitionId("");
  };

  // Remove spec from model
  const handleRemoveSpec = (specDefinitionId: string) => {
    setModelSpecs(modelSpecs.filter(ms => ms.specDefinitionId !== specDefinitionId));
  };

  // Update spec value
  const handleUpdateSpecValue = (specDefinitionId: string, value: string) => {
    setModelSpecs(modelSpecs.map(ms =>
      ms.specDefinitionId === specDefinitionId ? { ...ms, value } : ms
    ));
  };

  // Reset spec selector filters when type or category changes
  useEffect(() => {
    setSelectedSpecDefinitionId("");
  }, [selectedSpecType, selectedSpecCategory]);

  // Reset model specs when model dialog opens/closes
  useEffect(() => {
    if (!isModelDialogOpen) {
      setModelSpecs([]);
      setSelectedSpecType("");
      setSelectedSpecCategory("");
      setSelectedSpecDefinitionId("");
    }
  }, [isModelDialogOpen]);

  const fetchCompanyAndRates = async () => {
    try {
      const [companyRes, ratesRes] = await Promise.all([
        fetch("/api/company"),
        fetch("/api/exchange-rates"),
      ]);

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData);
      }

      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        // Expecting an array like [{ from, to, rate }]
        setExchangeRates(ratesData);
      }
    } catch (error) {
      console.error("Error fetching company or exchange rates:", error);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const ratesRes = await fetch("/api/exchange-rates");
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setExchangeRates(ratesData);
      }
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
    }
  };

  const fetchFamilies = async () => {
    try {
      const response = await fetch("/api/machines/families");
      if (response.ok) {
        const data = await response.json();
        setFamilies(data);
      }
    } catch (error) {
      console.error("Error fetching families:", error);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/machines/models");
      if (response.ok) {
        const data = await response.json();
        setModels(data);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  };

  const handleCreateOrUpdateFamily = async () => {
    if (!familyFormData.code || !familyFormData.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingFamilyId
        ? `/api/machines/families/${editingFamilyId}`
        : "/api/machines/families";
      const method = editingFamilyId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(familyFormData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: editingFamilyId
            ? "Family updated successfully"
            : "Family created successfully",
        });
        setIsFamilyDialogOpen(false);
        resetFamilyForm();
        fetchFamilies();
      } else {
        const error = await response.json().catch(() => null);
        toast({
          title: "Error",
          description: error?.error || "Failed to save family",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving family:", error);
      toast({
        title: "Error",
        description: "Failed to save family",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrUpdateModel = async () => {
    // Validate Step 1 fields
    if (!modelFormData.familyId || !modelFormData.code || !modelFormData.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Family, Code, Name)",
        variant: "destructive",
      });
      return;
    }

    // If on step 1, move to step 2
    if (modelStep === 1) {
      setModelStep(2);
      return;
    }

    // Step 2 - Submit the form
    setIsSubmitting(true);
    try {
      const url = editingModelId
        ? `/api/machines/models/${editingModelId}`
        : "/api/machines/models";
      const method = editingModelId ? "PUT" : "POST";

      const payload: Partial<MachineModel> = {
        familyId: modelFormData.familyId,
        code: modelFormData.code,
        name: modelFormData.name,
        description: modelFormData.description,
        basePrice: parseFloat(modelFormData.basePrice) || 0,
        isManufactured: modelFormData.isManufactured,
        currency: modelFormData.currency,
        mechanicalSpecs: modelFormData.mechanicalSpecs,
        electricalSpecs: modelFormData.electricalSpecs,
        physicalSpecs: modelFormData.physicalSpecs,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        const modelId = result.model?.id || editingModelId;

        // Save model specs if there are any
        if (modelSpecs.length > 0 && modelId) {
          try {
            const specsResponse = await fetch('/api/model-specs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                modelId,
                specs: modelSpecs.map(ms => ({
                  specDefinitionId: ms.specDefinitionId,
                  value: ms.value,
                })),
              }),
            });

            if (!specsResponse.ok) {
              const specsError = await specsResponse.json();
              console.error('Failed to save model specs:', specsError);
              toast({
                title: "Warning",
                description: "Model created but specs failed to save",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error('Error saving model specs:', error);
            toast({
              title: "Warning",
              description: "Model created but specs failed to save",
              variant: "destructive",
            });
          }
        }

        toast({
          title: "Success",
          description: editingModelId ? "Model updated successfully" : "Model created successfully",
        });
        setIsModelDialogOpen(false);
        resetModelForm();
        fetchModels();
      } else {
        const error = await response.json().catch(() => null);
        toast({
          title: "Error",
          description: error?.error || "Failed to save model",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving model:", error);
      toast({
        title: "Error",
        description: "Failed to save model",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFamily = (family: MachineFamily) => {
    setEditingFamilyId(family.id);
    setFamilyFormData({
      code: family.code,
      name: family.name,
      description: family.description || "",
    });
    setIsFamilyDialogOpen(true);
  };

  const handleEditModel = async (model: MachineModel) => {
    setEditingModelId(model.id);
    setModelFormData({
      familyId: model.familyId,
      code: model.code,
      name: model.name,
      description: model.description || "",
      basePrice: model.basePrice?.toString() || "",
      isManufactured: model.isManufactured ?? true,
      currency: model.currency || "EUR",
      mechanicalSpecs: model.mechanicalSpecs || MECH_SPECS_INITIAL,
      electricalSpecs: model.electricalSpecs || ELEC_SPECS_INITIAL,
      physicalSpecs: model.physicalSpecs || PHYS_SPECS_INITIAL,
    });
    setModelStep(1);
    setIsModelDialogOpen(true);

    // Load existing model specs
    try {
      const response = await fetch(`/api/model-specs?modelId=${model.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.specs && Array.isArray(data.specs)) {
          setModelSpecs(data.specs.map((ms: any) => ({
            specDefinitionId: ms.specDefinitionId,
            specDefinition: ms.specDefinition,
            value: ms.value || "",
          })));
        }
      }
    } catch (error) {
      console.error('Error loading model specs:', error);
    }
  };

  const handleApplySpecTemplate = (templateId: string) => {
    const template = specTemplates.find((t) => t.id === templateId);
    if (!template) return;

    // Parse the template fields (they're stored as JSON string in DB)
    const templateFields = template.fields;

    // Apply template fields based on category
    // This is a simplified version - you may need to adjust based on your actual template structure
    toast({
      title: "Template Applied",
      description: `Template "${template.name}" applied successfully`,
    });
  };

  const handleDeleteFamily = async (id: string, name: string, modelsCount: number) => {
    setFamilyToDelete({ id, name, modelsCount });
    setDeleteFamilyDialogOpen(true);
  };

  const confirmDeleteFamily = async () => {
    if (!familyToDelete) return;

    try {
      const response = await fetch(`/api/machines/families/${familyToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteModels: deleteFamilyModels }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: deleteFamilyModels
            ? `Family "${familyToDelete.name}" and ${familyToDelete.modelsCount} ${familyToDelete.modelsCount === 1 ? 'model' : 'models'} deleted successfully`
            : `Family "${familyToDelete.name}" deleted successfully`,
        });
        setDeleteFamilyDialogOpen(false);
        setDeleteFamilyModels(false);
        setFamilyToDelete(null);
        fetchFamilies();
        fetchModels();
      } else {
        const error = await response.json().catch(() => null);
        toast({
          title: "Error",
          description: error?.error || "Failed to delete family",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting family:", error);
      toast({
        title: "Error",
        description: "Failed to delete family",
        variant: "destructive",
      });
    }
  };

  const handleDeleteModel = async (id: string, name: string) => {
    setModelToDelete({ id, name });
    setDeleteModelDialogOpen(true);
  };

  const confirmDeleteModel = async () => {
    if (!modelToDelete) return;

    try {
      const response = await fetch(`/api/machines/models/${modelToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Model "${modelToDelete.name}" deleted successfully`,
        });
        setDeleteModelDialogOpen(false);
        setModelToDelete(null);
        fetchModels();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete model",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting model:", error);
      toast({
        title: "Error",
        description: "Failed to delete model",
        variant: "destructive",
      });
    }
  };

  const handleViewModelInfo = async (model: MachineModel) => {
    setSelectedModelForInfo(model);
    setSelectedModelSpecs([]);

    // Fetch model specs
    try {
      const response = await fetch(`/api/model-specs?modelId=${model.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedModelSpecs(data.specs || []);
      }
    } catch (error) {
      console.error('Error fetching model specs:', error);
    }

    setModelInfoOpen(true);
  };

  const resetFamilyForm = () => {
    setEditingFamilyId(null);
    setFamilyFormData(FAMILY_FORM_INITIAL);
  };

  const resetModelForm = () => {
    setEditingModelId(null);
    setModelFormData(MODEL_FORM_INITIAL);
    setModelStep(1);
    setSelectedSpecIds([]);
  };

  const filteredModels = models.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      (m.family?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredFamilies = families.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("machines")}</h1>
          <p className="text-muted-foreground mt-1">{t("machinesList")}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setSpecManagementOpen(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Spec Management
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="families">
            <FolderOpen className="h-4 w-4 mr-2" />
            {t("machineFamilies")} ({families.length})
          </TabsTrigger>
          <TabsTrigger value="models">
            <Package className="h-4 w-4 mr-2" />
            {t("machineModels")} ({models.length})
          </TabsTrigger>
        </TabsList>

        {/* Families Tab */}
        <TabsContent value="families" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <CardTitle>{t("machineFamilies")}</CardTitle>
                  <CardDescription>
                    {families.length} {families.length === 1 ? t("family") : t("families")} in database
                  </CardDescription>
                </div>

                <Dialog
                  open={isFamilyDialogOpen}
                  onOpenChange={(open) => {
                    setIsFamilyDialogOpen(open);
                    if (!open) resetFamilyForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("addMachineFamily")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingFamilyId ? "Edit Family" : "Create New Family"}</DialogTitle>
                      <DialogDescription>Fill in the family details below</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="family-code">Code *</Label>
                        <Input
                          id="family-code"
                          value={familyFormData.code}
                          onChange={(e) => setFamilyFormData({ ...familyFormData, code: e.target.value })}
                          placeholder="e.g., MZ"
                        />
                      </div>

                      <div>
                        <Label htmlFor="family-name">Name *</Label>
                        <Input
                          id="family-name"
                          value={familyFormData.name}
                          onChange={(e) => setFamilyFormData({ ...familyFormData, name: e.target.value })}
                          placeholder="e.g., Mazak"
                        />
                      </div>

                      <div>
                        <Label htmlFor="family-description">Description</Label>
                        <textarea
                          id="family-description"
                          value={familyFormData.description}
                          onChange={(e) => setFamilyFormData({ ...familyFormData, description: e.target.value })}
                          placeholder="Family description..."
                          rows={3}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsFamilyDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateOrUpdateFamily} disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Family"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search families..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Models Count</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredFamilies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {search ? "No families found matching your search" : "No families yet. Add your first family!"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFamilies.map((family) => (
                        <TableRow key={family.id}>
                          <TableCell className="font-medium">{family.code}</TableCell>
                          <TableCell>{family.name}</TableCell>
                          <TableCell className="text-muted-foreground">{family.description || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{models.filter((m) => m.familyId === family.id).length}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditFamily(family)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteFamily(family.id, family.name, models.filter((m) => m.familyId === family.id).length)}>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <CardTitle>Machine Models</CardTitle>
                  <CardDescription>{models.length} {models.length === 1 ? "model" : "models"} in database</CardDescription>
                </div>

                <Dialog
                  open={isModelDialogOpen}
                  onOpenChange={(open) => {
                    setIsModelDialogOpen(open);
                    if (!open) resetModelForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Model
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="!max-w-[90vw] !sm:max-w-[90vw] !w-[90vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingModelId ? "Edit Model" : "Create New Model"}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {modelStep === 1 ? "(Step 1 of 2)" : "(Step 2 of 2)"}
                        </span>
                      </DialogTitle>
                      <DialogDescription>
                        {modelStep === 1
                          ? "Fill in the basic model information"
                          : "Add description and select specification templates"}
                      </DialogDescription>
                    </DialogHeader>

                    {/* Step Progress Indicator */}
                    <div className="flex items-center justify-center gap-2 py-2">
                      <div className={`h-2 flex-1 rounded-full transition-colors ${modelStep >= 1 ? "bg-primary" : "bg-muted"}`} />
                      <div className={`h-2 flex-1 rounded-full transition-colors ${modelStep >= 2 ? "bg-primary" : "bg-muted"}`} />
                    </div>

                    <div className="grid gap-4 py-4">
                      {modelStep === 1 ? (
                        // Step 1: Basic Information
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-muted-foreground">Basic Information</h4>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                              <Label htmlFor="model-family">Family *</Label>
                              <select
                                id="model-family"
                                value={modelFormData.familyId}
                                onChange={(e) => setModelFormData({ ...modelFormData, familyId: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="" className="bg-background text-foreground">Select a family</option>
                                {families.map((f) => (
                                  <option key={f.id} value={f.id} className="bg-background text-foreground">
                                    {f.name} ({f.code})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <Label htmlFor="model-code">Code *</Label>
                              <Input id="model-code" value={modelFormData.code} onChange={(e) => setModelFormData({ ...modelFormData, code: e.target.value })} placeholder="e.g., MZ100" />
                            </div>

                            <div>
                              <Label htmlFor="model-name">Name *</Label>
                              <Input id="model-name" value={modelFormData.name} onChange={(e) => setModelFormData({ ...modelFormData, name: e.target.value })} placeholder="e.g., Mazak 100" />
                            </div>

                            <div>
                              <Label htmlFor="model-price">Base Price</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="model-price"
                                  type="number"
                                  value={modelFormData.basePrice || ''}
                                  onChange={(e) => setModelFormData({ ...modelFormData, basePrice: e.target.value })}
                                  placeholder="0.00"
                                  step="0.01"
                                  min="0"
                                />
                                <span className="text-sm text-muted-foreground self-center">{getCurrencySymbol(modelFormData.currency)}</span>
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="model-currency">
                                Currency
                              </Label>
                              <select
                                id="model-currency"
                                value={modelFormData.currency}
                                onChange={(e) => setModelFormData({ ...modelFormData, currency: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {CURRENCIES.map((curr) => (
                                  <option key={curr.value} value={curr.value} className="bg-background text-foreground">{curr.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                              id="model-manufactured"
                              checked={modelFormData.isManufactured}
                              onCheckedChange={(checked) => setModelFormData({ ...modelFormData, isManufactured: checked as boolean })}
                            />
                            <Label htmlFor="model-manufactured" className="cursor-pointer">Manufactured (generates serial numbers)</Label>
                          </div>
                        </div>
                      ) : (
                        // Step 2: Description and Specs Selection
                        <div className="space-y-6">
                          <h4 className="text-sm font-semibold text-muted-foreground">Description</h4>
                          <div>
                            <Label htmlFor="model-description">Model Description</Label>
                            <textarea
                              id="model-description"
                              value={modelFormData.description}
                              onChange={(e) => setModelFormData({ ...modelFormData, description: e.target.value })}
                              placeholder="Enter a detailed description of the model..."
                              rows={4}
                              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>

                          <div className="border-t pt-6">
                            <h4 className="text-sm font-semibold text-muted-foreground mb-4">Add Specifications</h4>
                            <p className="text-xs text-muted-foreground mb-4">
                              Select specifications from Spec Management and add them to this model
                            </p>

                            {/* Spec Selector */}
                            <div className="grid gap-4 md:grid-cols-3 mb-6 p-4 bg-muted/50 rounded-lg">
                              <div>
                                <Label htmlFor="spec-type">Spec Type</Label>
                                <select
                                  id="spec-type"
                                  value={selectedSpecType}
                                  onChange={(e) => {
                                    setSelectedSpecType(e.target.value);
                                    setSelectedSpecCategory("");
                                  }}
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                                >
                                  <option value="">All Types</option>
                                  {getUniqueSpecTypes().length === 0 && (
                                    <option value="" disabled>No spec types available. Create specs first.</option>
                                  )}
                                  {getUniqueSpecTypes().map((type) => (
                                    <option key={type} value={type} className="bg-background text-foreground">
                                      {type}
                                    </option>
                                  ))}
                                </select>
                                {specDefinitions.length === 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    No specifications available. <Button type="button" variant="link" size="sm" onClick={() => setSpecManagementOpen(true)} className="h-auto p-0">Create specs</Button>
                                  </p>
                                )}
                              </div>

                              <div>
                                <Label htmlFor="spec-category">Category</Label>
                                <select
                                  id="spec-category"
                                  value={selectedSpecCategory}
                                  onChange={(e) => setSelectedSpecCategory(e.target.value)}
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                                >
                                  <option value="">All Categories</option>
                                  {getCategoriesForType(selectedSpecType).map((category) => (
                                    <option key={category} value={category} className="bg-background text-foreground">
                                      {category}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <Label htmlFor="spec-definition">Specification</Label>
                                <div className="flex gap-2 mt-1">
                                  <select
                                    id="spec-definition"
                                    value={selectedSpecDefinitionId}
                                    onChange={(e) => setSelectedSpecDefinitionId(e.target.value)}
                                    className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <option value="">Select a spec...</option>
                                    {getSpecsForFilters(selectedSpecType, selectedSpecCategory).map((spec) => (
                                      <option key={spec.id} value={spec.id} className="bg-background text-foreground">
                                        {spec.code || spec.labelEn || spec.labelFr || spec.labelAr}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    type="button"
                                    onClick={handleAddSpec}
                                    disabled={!selectedSpecDefinitionId}
                                    size="icon"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Debug Info - Remove in production */}
                            {process.env.NODE_ENV === 'development' && (
                              <details className="mt-4 text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                  Debug: Spec Definitions ({specDefinitions.length})
                                </summary>
                                <div className="mt-2 p-2 bg-muted rounded max-h-40 overflow-y-auto">
                                  {specDefinitions.length === 0 ? (
                                    <p className="text-muted-foreground">No spec definitions loaded</p>
                                  ) : (
                                    <ul className="space-y-1">
                                      {specDefinitions.map((spec) => (
                                        <li key={spec.id} className="text-muted-foreground">
                                          <strong>{spec.code || 'No code'}</strong> - Type: "{spec.type}" - Category: "{spec.category || 'None'}"
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </details>
                            )}

                            {/* Added Specs with Values */}
                            {modelSpecs.length === 0 ? (
                              <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg bg-muted/30">
                                <p>No specifications added yet</p>
                                <p className="text-xs mt-1">Use the selectors above to add specifications</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {modelSpecs.map((modelSpec) => (
                                  <div key={modelSpec.specDefinitionId} className="flex items-start gap-3 p-4 border rounded-lg bg-background">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="text-xs">
                                          {modelSpec.specDefinition.type}
                                        </Badge>
                                        {modelSpec.specDefinition.category && (
                                          <Badge variant="secondary" className="text-xs">
                                            {modelSpec.specDefinition.category}
                                          </Badge>
                                        )}
                                        <span className="font-medium text-sm">
                                          {modelSpec.specDefinition.code || modelSpec.specDefinition.labelEn || modelSpec.specDefinition.labelFr || modelSpec.specDefinition.labelAr}
                                        </span>
                                      </div>

                                      <div className="grid gap-2 md:grid-cols-3">
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Value</Label>
                                          {modelSpec.specDefinition.type === 'boolean' ? (
                                            <select
                                              value={modelSpec.value}
                                              onChange={(e) => handleUpdateSpecValue(modelSpec.specDefinitionId, e.target.value)}
                                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                                            >
                                              <option value="">Select...</option>
                                              <option value="true">Yes</option>
                                              <option value="false">No</option>
                                            </select>
                                          ) : (
                                            <div className="flex gap-2 mt-1">
                                              <Input
                                                type="number"
                                                step="0.01"
                                                value={modelSpec.value}
                                                onChange={(e) => handleUpdateSpecValue(modelSpec.specDefinitionId, e.target.value)}
                                                placeholder="Enter value"
                                                className="flex-1"
                                              />
                                              {modelSpec.specDefinition.unit && (
                                                <span className="text-sm text-muted-foreground self-center">
                                                  {modelSpec.specDefinition.unit}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        <div className="md:col-span-2">
                                          <Label className="text-xs text-muted-foreground">Description</Label>
                                          <p className="text-sm text-foreground mt-1">
                                            {modelSpec.specDefinition.descriptionEn || modelSpec.specDefinition.descriptionFr || modelSpec.specDefinition.descriptionAr || "-"}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveSpec(modelSpec.specDefinitionId)}
                                      className="shrink-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between gap-2">
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsModelDialogOpen(false)}>
                          Cancel
                        </Button>
                        {modelStep === 2 && (
                          <Button variant="outline" onClick={() => setModelStep(1)}>
                            Back
                          </Button>
                        )}
                      </div>
                      <Button onClick={handleCreateOrUpdateModel} disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : modelStep === 1 ? "Next: Description & Specs" : "Save Model"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search models..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
                <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  {CURRENCIES.map((curr) => (
                    <option key={curr.value} value={curr.value} className="bg-background text-foreground">{curr.label}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Family</TableHead>
                      <TableHead>Price ({selectedCurrency})</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredModels.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {search ? "No models found matching your search" : "No models yet. Add your first model!"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredModels.map((model) => (
                        <TableRow key={model.id}>
                          <TableCell className="font-medium">{model.code}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{model.name}</p>
                              {model.description && <p className="text-xs text-muted-foreground">{model.description}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{model.family?.name || "-"}</TableCell>
                          <TableCell>
                            {model.basePrice != null ? (
                              <span>
                                {(
                                  convertPrice(model.basePrice ?? 0, model.currency || "EUR", selectedCurrency, exchangeRates) ?? 0
                                ).toLocaleString()} {getCurrencySymbol(selectedCurrency)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={model.isManufactured ? "default" : "secondary"}>
                              {model.isManufactured ? "Manufactured" : "Imported"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleViewModelInfo(model)}>
                                <Info className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditModel(model)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteModel(model.id, model.name)}>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Family Confirmation Dialog */}
      <AlertDialog open={deleteFamilyDialogOpen} onOpenChange={setDeleteFamilyDialogOpen}>
        <AlertDialogContent className="bg-background text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Family</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              {familyToDelete?.modelsCount === 0 ? (
                <>Are you sure you want to delete the family "{familyToDelete?.name}"? This action cannot be undone.</>
              ) : (
                <>
                  The family "{familyToDelete?.name}" has <strong>{familyToDelete?.modelsCount}</strong> {familyToDelete?.modelsCount === 1 ? 'model' : 'models'}.
                  <div className="mt-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-foreground">
                      <input
                        type="checkbox"
                        checked={deleteFamilyModels}
                        onChange={(e) => setDeleteFamilyModels(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="font-medium">Also delete all {familyToDelete?.modelsCount} {familyToDelete?.modelsCount === 1 ? 'model' : 'models'}</span>
                    </label>
                    {!deleteFamilyModels && (
                      <span className="text-sm text-destructive font-medium block">
                        If you don't delete the models, you must delete them separately before deleting this family.
                      </span>
                    )}
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteFamily}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {deleteFamilyModels ? 'Family & Models' : 'Family'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Model Confirmation Dialog */}
      <AlertDialog open={deleteModelDialogOpen} onOpenChange={setDeleteModelDialogOpen}>
        <AlertDialogContent className="bg-background text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Model</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              Are you sure you want to delete the model "{modelToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteModel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Model
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Spec Management Dialog */}
      <SpecManagementDialog
        open={specManagementOpen}
        onOpenChange={setSpecManagementOpen}
        onSpecsChanged={fetchSpecDefinitions}
      />

      {/* Model Info Dialog */}
      <Dialog open={modelInfoOpen} onOpenChange={setModelInfoOpen}>
        <DialogContent className="!max-w-[800px] !sm:max-w-[800px] !w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Model Information</DialogTitle>
            <DialogDescription>
              View detailed information about this model
            </DialogDescription>
          </DialogHeader>

          {selectedModelForInfo && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Code</Label>
                    <p className="font-medium">{selectedModelForInfo.code}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedModelForInfo.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Family</Label>
                    <p className="font-medium">{selectedModelForInfo.family?.name || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <Badge variant={selectedModelForInfo.isManufactured ? "default" : "secondary"}>
                      {selectedModelForInfo.isManufactured ? "Manufactured" : "Imported"}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Base Price</Label>
                    <p className="font-medium">
                      {selectedModelForInfo.basePrice != null
                        ? `${selectedModelForInfo.basePrice.toLocaleString()} ${getCurrencySymbol(selectedModelForInfo.currency || "EUR")}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Created</Label>
                    <p className="text-sm">{new Date(selectedModelForInfo.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedModelForInfo.description && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Description</h3>
                  <p className="text-sm text-foreground bg-muted/50 p-4 rounded-lg">
                    {selectedModelForInfo.description}
                  </p>
                </div>
              )}

              {/* Specifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Specifications
                </h3>

                {selectedModelSpecs.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg bg-muted/30">
                    <p>No specifications defined for this model</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedModelSpecs.map((modelSpec) => (
                      <div key={modelSpec.id} className="p-4 border rounded-lg bg-background">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {modelSpec.specDefinition?.type}
                              </Badge>
                              {modelSpec.specDefinition?.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {modelSpec.specDefinition.category}
                                </Badge>
                              )}
                              <span className="font-medium">
                                {modelSpec.specDefinition?.code ||
                                 modelSpec.specDefinition?.labelEn ||
                                 modelSpec.specDefinition?.labelFr ||
                                 modelSpec.specDefinition?.labelAr ||
                                 'Unknown Spec'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-muted-foreground">Value</Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="font-medium text-lg">
                                    {modelSpec.value ||
                                     (modelSpec.specDefinition?.type === 'boolean' ? '-' : '0')}
                                  </span>
                                  {modelSpec.specDefinition?.unit && (
                                    <span className="text-sm text-muted-foreground">
                                      {modelSpec.specDefinition.unit}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Description</Label>
                                <p className="text-sm text-foreground mt-1">
                                  {modelSpec.specDefinition?.descriptionEn ||
                                   modelSpec.specDefinition?.descriptionFr ||
                                   modelSpec.specDefinition?.descriptionAr ||
                                   '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
