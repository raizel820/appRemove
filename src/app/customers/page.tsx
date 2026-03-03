"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Edit, Trash2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";

interface Customer {
  id: string;
  code: string;
  fullName: string;
  shortName: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  nif?: string;
  nis?: string;
  rib?: string;
  rcn?: string;

  notes?: string;
  createdAt: string;
}

const CUSTOMER_FORM_INITIAL = {
  code: "",
  fullName: "",
  shortName: "",
  address: "",
  city: "",
  country: "",
  phone: "",
  email: "",
  nif: "",
  nis: "",
  rib: "",
  rcn: "",
  notes: "",
};

export default function CustomersPage() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState(CUSTOMER_FORM_INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = customers.filter(
        (c) =>
          c.fullName.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.shortName.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [search, customers]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.code || !formData.fullName || !formData.shortName) {
      toast({
        title: t("error"),
        description: t("required"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingCustomerId
        ? `/api/customers/${editingCustomerId}`
        : "/api/customers";
      const method = editingCustomerId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: t("success"),
          description: editingCustomerId
            ? t("customerUpdated")
            : t("customerCreated"),
        });
        setIsDialogOpen(false);
        resetForm();
        fetchCustomers();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || t("failedToUpdateCustomer"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      toast({
        title: t("error"),
        description: t("failedToUpdateCustomer"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setFormData({
      code: customer.code,
      fullName: customer.fullName,
      shortName: customer.shortName,
      address: customer.address || "",
      city: customer.city || "",
      country: customer.country || "",
      phone: customer.phone || "",
      email: customer.email || "",
      nif: customer.nif || "",
      nis: customer.nis || "",
      rib: customer.rib || "",
      rcn: customer.rcn || "",
      notes: customer.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setCustomerToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      const response = await fetch(`/api/customers/${customerToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: t("success"),
          description: t("customerDeleted"),
        });
        setDeleteDialogOpen(false);
        fetchCustomers();
      } else {
        toast({
          title: t("error"),
          description: t("failedToDeleteCustomer"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: t("error"),
        description: t("failedToDeleteCustomer"),
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingCustomerId(null);
    setFormData(CUSTOMER_FORM_INITIAL);
  };

  return (
    <div className="w-full py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("customers")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("customersList")}
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("addCustomer")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomerId ? t("editCustomer") : t("addCustomer")}
              </DialogTitle>
              <DialogDescription>
                {t("customerCode")}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">{t("customerCode")} *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      placeholder="e.g., CUST001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shortName">{t("shortName")} *</Label>
                    <Input
                      id="shortName"
                      value={formData.shortName}
                      onChange={(e) =>
                        setFormData({ ...formData, shortName: e.target.value })
                      }
                      placeholder="e.g., Acme"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    placeholder="e.g., Acme Corporation"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      placeholder="Country"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nif">NIF (VAT Number)</Label>
                    <Input
                      id="nif"
                      value={formData.nif}
                      onChange={(e) =>
                        setFormData({ ...formData, nif: e.target.value })
                      }
                      placeholder="VAT Number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nis">NIS</Label>
                    <Input
                      id="nis"
                      value={formData.nis}
                      onChange={(e) =>
                        setFormData({ ...formData, nis: e.target.value })
                      }
                      placeholder="NIS"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rib">RIB (Bank Account)</Label>
                    <Input
                      id="rib"
                      value={formData.rib}
                      onChange={(e) =>
                        setFormData({ ...formData, rib: e.target.value })
                      }
                      placeholder="Bank Account"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rcn">RCN</Label>
                    <Input
                      id="rcn"
                      value={formData.rcn}
                      onChange={(e) =>
                        setFormData({ ...formData, rcn: e.target.value })
                      }
                      placeholder="RCN"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes..."
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleCreateOrUpdate} disabled={isSubmitting}>
                {isSubmitting ? t("saving") : t("save")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("customersList")}</CardTitle>
          <CardDescription>
            {customers.length} {customers.length !== 1 ? t("customers") : t("customer")} {customers.length !== 1 ? t("in") : ""} database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("customerCode")}</TableHead>
                  <TableHead>{t("fullName")}</TableHead>
                  <TableHead>{t("city")}</TableHead>
                  <TableHead>Identifiers</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {search ? t("noResults") : t("noResults")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.fullName}</p>
                          <p className="text-sm text-muted-foreground">{customer.shortName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3" />
                          {customer.city && customer.country
                            ? `${customer.city}, ${customer.country}`
                            : customer.city || customer.country || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {customer.nif && (
                            <Badge variant="outline" className="text-xs">NIF</Badge>
                          )}
                          {customer.nis && (
                            <Badge variant="outline" className="text-xs">NIS</Badge>
                          )}
                          {customer.rib && (
                            <Badge variant="outline" className="text-xs">RIB</Badge>
                          )}
                          {customer.rcn && (
                            <Badge variant="outline" className="text-xs">RCN</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(customer.id)}
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
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteCustomer")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteCustomerConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
