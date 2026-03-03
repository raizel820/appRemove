"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Check, ChevronDown, ChevronUp, Edit, Save, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

interface CompanyProfile {
  id: string;
  profileNumber: number;
  profileName: string;
  nif?: string;
  nis?: string;
  rcn?: string;
  rib?: string;
  bankName?: string;
  fundCapital?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ActivityProfileSectionProps {
  company: any;
  onCompanyChange?: (company: any) => void;
}

export default function ActivityProfileSection({ company, onCompanyChange }: ActivityProfileSectionProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<CompanyProfile | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activatingProfileId, setActivatingProfileId] = useState<string | null>(null);

  // Form state for creating/editing profiles
  const [formData, setFormData] = useState({
    profileNumber: 1,
    profileName: "",
    nif: "",
    nis: "",
    rcn: "",
    rib: "",
    bankName: "",
    fundCapital: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  // Fetch profiles on mount
  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/company-profiles");
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!formData.profileName) {
      toast({
        title: t("error"),
        description: t("profileNameRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/company-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          fundCapital: formData.fundCapital ? parseFloat(formData.fundCapital) : null,
          makeActive: profiles.length === 0, // Make first profile active
        }),
      });

      if (response.ok) {
        toast({
          title: t("success"),
          description: t("profileCreated"),
        });
        setShowCreateForm(false);
        resetForm();
        await fetchProfiles();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || t("failedToCreateProfile"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      toast({
        title: t("error"),
        description: t("failedToCreateProfile"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProfile = async (profileId: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/company-profiles/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          fundCapital: formData.fundCapital ? parseFloat(formData.fundCapital) : null,
        }),
      });

      if (response.ok) {
        toast({
          title: t("success"),
          description: t("profileUpdated"),
        });
        setEditingProfile(null);
        resetForm();
        await fetchProfiles();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || t("failedToUpdateProfile"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: t("error"),
        description: t("failedToUpdateProfile"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetActiveProfile = async (profileId: string) => {
    setActivatingProfileId(profileId);
    try {
      const response = await fetch(`/api/company-profiles/${profileId}/set-active`, {
        method: "PUT",
      });

      if (response.ok) {
        toast({
          title: t("success"),
          description: t("profileActivated"),
        });
        await fetchProfiles();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || t("failedToActivateProfile"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error setting active profile:", error);
      toast({
        title: t("error"),
        description: t("failedToActivateProfile"),
        variant: "destructive",
      });
    } finally {
      setActivatingProfileId(null);
    }
  };

  const handleDeleteProfile = async (profile: CompanyProfile) => {
    setProfileToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProfile = async () => {
    if (!profileToDelete) return;

    try {
      const response = await fetch(`/api/company-profiles/${profileToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: t("success"),
          description: t("profileDeleted"),
        });
        setDeleteDialogOpen(false);
        setProfileToDelete(null);
        await fetchProfiles();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || t("failedToDeleteProfile"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast({
        title: t("error"),
        description: t("failedToDeleteProfile"),
        variant: "destructive",
      });
    }
  };

  const startEditing = (profile: CompanyProfile) => {
    setFormData({
      profileNumber: profile.profileNumber,
      profileName: profile.profileName,
      nif: profile.nif || "",
      nis: profile.nis || "",
      rcn: profile.rcn || "",
      rib: profile.rib || "",
      bankName: profile.bankName || "",
      fundCapital: profile.fundCapital ? String(profile.fundCapital) : "",
    });
    setEditingProfile(profile.id);
    setExpandedProfiles(new Set([profile.id]));
  };

  const resetForm = () => {
    setFormData({
      profileNumber: 1,
      profileName: "",
      nif: "",
      nis: "",
      rcn: "",
      rib: "",
      bankName: "",
      fundCapital: "",
    });
  };

  const toggleExpanded = (profileId: string) => {
    setExpandedProfiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      return newSet;
    });
  };

  const getNextProfileNumber = () => {
    if (profiles.length === 0) return 1;
    const maxNumber = Math.max(...profiles.map((p) => p.profileNumber));
    return maxNumber + 1;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("activityProfiles")}</CardTitle>
          <CardDescription>{t("loadingProfiles")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{t("activityProfiles")}</CardTitle>
            <CardDescription>{t("activityProfilesDescription")}</CardDescription>
            {profiles.length > 0 && profiles.find(p => p.isActive) && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="default" className="bg-green-500">
                  {t("active")}: #{profiles.find(p => p.isActive)?.profileNumber} - {profiles.find(p => p.isActive)?.profileName}
                </Badge>
              </div>
            )}
          </div>
          <Button onClick={() => { setShowCreateForm(true); resetForm(); setFormData(prev => ({ ...prev, profileNumber: getNextProfileNumber() })); }}>
            <Plus className="h-4 w-4 mr-2" />
            {t("createProfile")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create New Profile Form */}
        {showCreateForm && (
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{t("createNewProfile")}</h4>
              <Button variant="ghost" size="icon" onClick={() => { setShowCreateForm(false); resetForm(); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-profile-number">{t("profileNumber")}</Label>
                <Input
                  id="new-profile-number"
                  type="number"
                  value={formData.profileNumber}
                  onChange={(e) => setFormData({ ...formData, profileNumber: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="new-profile-name">{t("profileName")} *</Label>
                <Input
                  id="new-profile-name"
                  value={formData.profileName}
                  onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                  placeholder={t("profileNamePlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="new-profile-nif">{t("nif")}</Label>
                <Input
                  id="new-profile-nif"
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                  placeholder={t("nifPlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="new-profile-nis">{t("nis")}</Label>
                <Input
                  id="new-profile-nis"
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  placeholder={t("nisPlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="new-profile-rcn">{t("rcn")}</Label>
                <Input
                  id="new-profile-rcn"
                  value={formData.rcn}
                  onChange={(e) => setFormData({ ...formData, rcn: e.target.value })}
                  placeholder={t("rcnPlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="new-profile-rib">{t("rib")}</Label>
                <Input
                  id="new-profile-rib"
                  value={formData.rib}
                  onChange={(e) => setFormData({ ...formData, rib: e.target.value })}
                  placeholder={t("ribPlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="new-profile-bankName">{t("bankName")}</Label>
                <Input
                  id="new-profile-bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder={t("bankNamePlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="new-profile-fundCapital">{t("fundCapital")}</Label>
                <Input
                  id="new-profile-fundCapital"
                  type="number"
                  value={formData.fundCapital}
                  onChange={(e) => setFormData({ ...formData, fundCapital: e.target.value })}
                  placeholder={t("fundCapitalPlaceholder")}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateProfile} disabled={isSaving}>
                {isSaving ? t("creating") : t("create")}
              </Button>
              <Button variant="outline" onClick={() => { setShowCreateForm(false); resetForm(); }}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}

        {/* Profiles List */}
        {profiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("noProfilesYet")}
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <Collapsible
                key={profile.id}
                open={expandedProfiles.has(profile.id) || editingProfile === profile.id}
                onOpenChange={() => toggleExpanded(profile.id)}
              >
                <Card className={profile.isActive ? "border-primary" : ""}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {profile.isActive && <Check className="h-5 w-5 text-primary" />}
                          <div>
                            <CardTitle className="text-base">
                              #{profile.profileNumber} - {profile.profileName}
                            </CardTitle>
                            {profile.nif && (
                              <CardDescription className="text-xs">
                                {t("nif")}: {profile.nif}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!profile.isActive && (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs border-2 border-primary hover:border-primary/80"
                              onClick={(e) => { e.stopPropagation(); handleSetActiveProfile(profile.id); }}
                              disabled={activatingProfileId === profile.id}
                            >
                              {activatingProfileId === profile.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  {t("activating")}
                                </>
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  {t("setAsActive")}
                                </>
                              )}
                            </Button>
                          )}
                          {profile.isActive && (
                            <Badge variant="default" className="bg-primary">
                              {t("active")}
                            </Badge>
                          )}
                          {expandedProfiles.has(profile.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-4 space-y-4">
                      {editingProfile === profile.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`edit-profile-number-${profile.id}`}>{t("profileNumber")}</Label>
                              <Input
                                id={`edit-profile-number-${profile.id}`}
                                type="number"
                                value={formData.profileNumber}
                                onChange={(e) => setFormData({ ...formData, profileNumber: parseInt(e.target.value) || 1 })}
                                min="1"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-profile-name-${profile.id}`}>{t("profileName")} *</Label>
                              <Input
                                id={`edit-profile-name-${profile.id}`}
                                value={formData.profileName}
                                onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                                placeholder={t("profileNamePlaceholder")}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-profile-nif-${profile.id}`}>{t("nif")}</Label>
                              <Input
                                id={`edit-profile-nif-${profile.id}`}
                                value={formData.nif}
                                onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                                placeholder={t("nifPlaceholder")}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-profile-nis-${profile.id}`}>{t("nis")}</Label>
                              <Input
                                id={`edit-profile-nis-${profile.id}`}
                                value={formData.nis}
                                onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                                placeholder={t("nisPlaceholder")}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-profile-rcn-${profile.id}`}>{t("rcn")}</Label>
                              <Input
                                id={`edit-profile-rcn-${profile.id}`}
                                value={formData.rcn}
                                onChange={(e) => setFormData({ ...formData, rcn: e.target.value })}
                                placeholder={t("rcnPlaceholder")}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-profile-rib-${profile.id}`}>{t("rib")}</Label>
                              <Input
                                id={`edit-profile-rib-${profile.id}`}
                                value={formData.rib}
                                onChange={(e) => setFormData({ ...formData, rib: e.target.value })}
                                placeholder={t("ribPlaceholder")}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-profile-bankName-${profile.id}`}>{t("bankName")}</Label>
                              <Input
                                id={`edit-profile-bankName-${profile.id}`}
                                value={formData.bankName}
                                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                placeholder={t("bankNamePlaceholder")}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-profile-fundCapital-${profile.id}`}>{t("fundCapital")}</Label>
                              <Input
                                id={`edit-profile-fundCapital-${profile.id}`}
                                type="number"
                                value={formData.fundCapital}
                                onChange={(e) => setFormData({ ...formData, fundCapital: e.target.value })}
                                placeholder={t("fundCapitalPlaceholder")}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleUpdateProfile(profile.id)} disabled={isSaving}>
                              <Save className="h-4 w-4 mr-2" />
                              {isSaving ? t("saving") : t("save")}
                            </Button>
                            <Button variant="outline" onClick={() => { setEditingProfile(null); resetForm(); }}>
                              {t("cancel")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            {profile.nif && (
                              <div>
                                <span className="text-muted-foreground">{t("nif")}:</span> {profile.nif}
                              </div>
                            )}
                            {profile.nis && (
                              <div>
                                <span className="text-muted-foreground">{t("nis")}:</span> {profile.nis}
                              </div>
                            )}
                            {profile.rcn && (
                              <div>
                                <span className="text-muted-foreground">{t("rcn")}:</span> {profile.rcn}
                              </div>
                            )}
                            {profile.rib && (
                              <div>
                                <span className="text-muted-foreground">{t("rib")}:</span> {profile.rib}
                              </div>
                            )}
                            {profile.bankName && (
                              <div>
                                <span className="text-muted-foreground">{t("bankName")}:</span> {profile.bankName}
                              </div>
                            )}
                            {profile.fundCapital && (
                              <div>
                                <span className="text-muted-foreground">{t("fundCapital")}:</span> {profile.fundCapital.toLocaleString()}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 pt-2 border-t">
                            {!profile.isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-2 border-primary hover:border-primary/80"
                                onClick={(e) => { e.stopPropagation(); handleSetActiveProfile(profile.id); }}
                                disabled={activatingProfileId === profile.id}
                              >
                                {activatingProfileId === profile.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {t("activating")}
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    {t("setAsActive")}
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); startEditing(profile); }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {t("edit")}
                            </Button>
                            {!profile.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile); }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteProfile")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteProfileConfirm").replace("{name}", profileToDelete?.profileName || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProfile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
