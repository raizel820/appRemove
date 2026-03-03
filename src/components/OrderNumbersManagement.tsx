"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Shield, 
  CheckCircle2, 
  RotateCcw, 
  AlertTriangle,
  Search,
  RefreshCw,
  Trash2,
  Save,
  X,
  Filter,
  FileText,
  Receipt,
  FileSpreadsheet,
  ShoppingCart,
  Truck
} from 'lucide-react';

interface OrderNumber {
  number: number;
  year: number;
  fullFormattedNumber: string;
  state: 'RESERVED' | 'USED' | 'REUSABLE' | 'BLOCKED';
  reservedBy: string | null;
  reservedAt: string | null;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  orders: Array<{
    id: string;
    type: string;
    fullNumber: string;
    customerName: string;
    date: string;
  }>;
}

interface OrderNumbersManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrderNumbersManagement({ open, onOpenChange }: OrderNumbersManagementProps) {
  const [numberType, setNumberType] = useState<'order' | 'invoice' | 'proforma' | 'delivery-note' | 'purchase-order'>('order');
  const [numbers, setNumbers] = useState<OrderNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<'ALL' | 'RESERVED' | 'USED' | 'REUSABLE' | 'BLOCKED'>('ALL');
  const [editingNumber, setEditingNumber] = useState<number | null>(null);
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [numberToDelete, setNumberToDelete] = useState<number | null>(null);

  const fetchNumbers = async () => {
    setLoading(true);
    try {
      let endpoint;
      if (numberType === 'order') {
        endpoint = '/api/admin/numbers/list';
      } else if (numberType === 'invoice') {
        endpoint = '/api/admin/invoices/numbers/list';
      } else if (numberType === 'proforma') {
        endpoint = '/api/admin/proformas/numbers/list';
      } else if (numberType === 'delivery-note') {
        endpoint = '/api/admin/delivery-notes/numbers/list';
      } else {
        endpoint = '/api/admin/purchase-orders/numbers/list';
      }
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setNumbers(data.numbers || []);
      }
    } catch (error) {
      console.error('Error fetching numbers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchNumbers();
    }
  }, [open, numberType]);



  const filteredNumbers = numbers.filter(num => {
    const matchesSearch = searchQuery === '' ||
      num.number.toString().includes(searchQuery) ||
      num.fullFormattedNumber.includes(searchQuery) ||
      (num.notes && num.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = stateFilter === 'ALL' || num.state === stateFilter;
    return matchesSearch && matchesFilter;
  });

  const handleStateChange = async (number: number, year: number, newState: string) => {
    try {
      let endpoint;
      if (numberType === 'order') {
        endpoint = `/api/admin/numbers/${number}`;
      } else if (numberType === 'invoice') {
        endpoint = `/api/admin/invoices/numbers/${number}`;
      } else if (numberType === 'proforma') {
        endpoint = `/api/admin/proformas/numbers/${number}`;
      } else if (numberType === 'delivery-note') {
        endpoint = `/api/admin/delivery-notes/numbers/${number}`;
      } else {
        endpoint = `/api/admin/purchase-orders/numbers/${number}`;
      }
      
      const response = await fetch(`${endpoint}?year=${year}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState, year }),
      });

      if (response.ok) {
        await fetchNumbers();
      } else {
        const error = await response.json();
        console.error('Error updating number state:', error);
        alert(error.error || 'Failed to update number state');
      }
    } catch (error) {
      console.error('Error updating number state:', error);
      alert('Failed to update number state');
    }
  };

  const handleSaveNotes = async (number: number) => {
    try {
      let endpoint;
      if (numberType === 'order') {
        endpoint = `/api/admin/numbers/${number}`;
      } else if (numberType === 'invoice') {
        endpoint = `/api/admin/invoices/numbers/${number}`;
      } else if (numberType === 'proforma') {
        endpoint = `/api/admin/proformas/numbers/${number}`;
      } else if (numberType === 'delivery-note') {
        endpoint = `/api/admin/delivery-notes/numbers/${number}`;
      } else {
        endpoint = `/api/admin/purchase-orders/numbers/${number}`;
      }
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNotes }),
      });

      if (response.ok) {
        await fetchNumbers();
        setEditingNumber(null);
      } else {
        const error = await response.json();
        console.error('Error saving notes:', error);
        alert(error.error || 'Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    }
  };

  const handleCleanupBlocked = async () => {
    try {
      let endpoint;
      if (numberType === 'order') {
        endpoint = '/api/admin/numbers/cleanup-blocked';
      } else if (numberType === 'invoice') {
        endpoint = '/api/admin/invoices/numbers/cleanup-blocked';
      } else if (numberType === 'proforma') {
        endpoint = '/api/admin/proformas/numbers/cleanup-blocked';
      } else if (numberType === 'delivery-note') {
        endpoint = '/api/admin/delivery-notes/numbers/cleanup-blocked';
      } else {
        endpoint = '/api/admin/purchase-orders/numbers/cleanup-blocked';
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchNumbers();
      }
    } catch (error) {
      console.error('Error cleaning up blocked numbers:', error);
    }
  };

  const handleDeleteNumber = async (number: number, year: number) => {
    try {
      let endpoint;
      if (numberType === 'order') {
        endpoint = `/api/admin/numbers/${number}?year=${year}`;
      } else if (numberType === 'invoice') {
        endpoint = `/api/admin/invoices/numbers/${number}?year=${year}`;
      } else if (numberType === 'proforma') {
        endpoint = `/api/admin/proformas/numbers/${number}?year=${year}`;
      } else if (numberType === 'delivery-note') {
        endpoint = `/api/admin/delivery-notes/numbers/${number}?year=${year}`;
      } else {
        endpoint = `/api/admin/purchase-orders/numbers/${number}?year=${year}`;
      }
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchNumbers();
      } else {
        const error = await response.json();
        console.error('Error deleting number:', error);
        alert(error.error || 'Failed to delete number');
      }
    } catch (error) {
      console.error('Error deleting number:', error);
      alert('Failed to delete number');
    }
  };

  const getStateBadge = (state: string) => {
    const config = {
      RESERVED: { color: 'bg-yellow-500', icon: Shield, label: 'Reserved' },
      USED: { color: 'bg-green-500', icon: CheckCircle2, label: 'Used' },
      REUSABLE: { color: 'bg-blue-500', icon: RotateCcw, label: 'Reusable' },
      BLOCKED: { color: 'bg-red-500', icon: AlertTriangle, label: 'Blocked' },
    };
    const { color, icon: Icon, label } = config[state as keyof typeof config] || config.BLOCKED;
    return (
      <Badge className={`${color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const stats = {
    total: numbers.length,
    reserved: numbers.filter(n => n.state === 'RESERVED').length,
    used: numbers.filter(n => n.state === 'USED').length,
    reusable: numbers.filter(n => n.state === 'REUSABLE').length,
    blocked: numbers.filter(n => n.state === 'BLOCKED').length,
  };

  const title = numberType === 'order'
    ? 'Order Numbers Management'
    : numberType === 'invoice'
      ? 'Invoice Numbers Management'
      : numberType === 'proforma'
        ? 'Proforma Invoice Numbers Management'
        : numberType === 'delivery-note'
          ? 'Delivery Note Numbers Management'
          : 'Purchase Order Numbers Management';
  const description = numberType === 'order'
    ? 'View and manage all order numbers, their states, and associated orders.'
    : numberType === 'invoice'
      ? 'View and manage all invoice numbers, their states, and associated invoices.'
      : numberType === 'proforma'
        ? 'View and manage all proforma invoice numbers, their states, and associated orders.'
        : numberType === 'delivery-note'
          ? 'View and manage all delivery note numbers, their states, and associated orders.'
          : 'View and manage all purchase order numbers, their states, and associated orders.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Number Type Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Number Type:</label>
          <Select
            value={numberType}
            onValueChange={(value: 'order' | 'invoice' | 'proforma' | 'delivery-note' | 'purchase-order') => setNumberType(value)}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="order">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Order Numbers</span>
                </div>
              </SelectItem>
              <SelectItem value="invoice">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  <span>Invoice Numbers</span>
                </div>
              </SelectItem>
              <SelectItem value="proforma">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Proforma Invoice Numbers</span>
                </div>
              </SelectItem>
              <SelectItem value="delivery-note">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>Delivery Note Numbers</span>
                </div>
              </SelectItem>
              <SelectItem value="purchase-order">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Purchase Order Numbers</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.reserved}</div>
            <div className="text-xs text-muted-foreground">Reserved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.used}</div>
            <div className="text-xs text-muted-foreground">Used</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.reusable}</div>
            <div className="text-xs text-muted-foreground">Reusable</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
            <div className="text-xs text-muted-foreground">Blocked</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanupBlocked}
            disabled={stats.blocked === 0}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Unblock All Blocked Numbers
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNumbers}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by number or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={stateFilter} onValueChange={(val: any) => setStateFilter(val)}>
            <SelectTrigger className="w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All States</SelectItem>
              <SelectItem value="RESERVED">Reserved</SelectItem>
              <SelectItem value="USED">Used</SelectItem>
              <SelectItem value="REUSABLE">Reusable</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Numbers List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredNumbers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No numbers found</div>
          ) : (
            filteredNumbers.map((num) => (
              <div key={`${num.year}-${num.number}`} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-lg">{num.fullFormattedNumber}</div>
                    {getStateBadge(num.state)}
                  </div>
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingNumber(num.number);
                              setEditNotes(num.notes || '');
                            }}
                            disabled={numberType === 'invoice' || numberType === 'proforma' || numberType === 'delivery-note' || numberType === 'purchase-order'}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{numberType === 'invoice' ? 'Notes not available for invoices' : numberType === 'proforma' ? 'Notes not available for proforma invoices' : numberType === 'delivery-note' ? 'Notes not available for delivery notes' : numberType === 'purchase-order' ? 'Notes not available for purchase orders' : 'Edit notes'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNumberToDelete(num.number);
                              setDeleteDialogOpen(true);
                              setEditingYear(num.year);
                            }}
                            disabled={num.orders.length > 0}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{num.orders.length > 0 ? 'Cannot delete: number has orders' : 'Delete number'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {num.orders.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Orders:</span>{' '}
                    {num.orders.map((o, i) => (
                      <span key={o.id}>
                        {o.type} {o.fullNumber} ({o.customerName})
                        {i < num.orders.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}

                {editingNumber === num.number ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Add notes..."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveNotes(num.number)}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Notes
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingNumber(null)}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {num.notes && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Notes:</span> {num.notes}
                      </div>
                    )}
                    {num.reservedBy && (
                      <div className="text-xs text-muted-foreground">
                        Reserved by {num.reservedBy} at {new Date(num.reservedAt!).toLocaleString()}
                      </div>
                    )}
                  </>
                )}

                {/* State Change Actions */}
                <div className="flex gap-2">
                  {num.state === 'BLOCKED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStateChange(num.number, num.year, 'REUSABLE')}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Unblock
                    </Button>
                  )}
                  {num.state === 'USED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStateChange(num.number, num.year, 'REUSABLE')}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Make Reusable
                    </Button>
                  )}
                  {num.state === 'RESERVED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStateChange(num.number, num.year, 'REUSABLE')}
                    >
                      Cancel Reservation
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Number {numberToDelete ? `#${numberToDelete}` : ''}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The number will be permanently removed from the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (numberToDelete && editingYear) {
                    handleDeleteNumber(numberToDelete, editingYear);
                    setDeleteDialogOpen(false);
                    setNumberToDelete(null);
                    setEditingYear(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
