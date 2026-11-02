import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  RawMaterial, InventoryTransaction, InventoryTransactionType, ProductionOrder
} from '../../core/models/interfaces';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, DecimalPipe, ReactiveFormsModule, FormsModule],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css'
})
export class InventoryComponent implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  materials: RawMaterial[] = [];
  transactions: InventoryTransaction[] = [];
  filteredTransactions: InventoryTransaction[] = [];
  productionOrders: ProductionOrder[] = [];

  // KPIs
  totalMaterials = 0;
  lowStockCount = 0;
  totalStockValue = 0;
  totalTransactions = 0;

  // Search & Filters for Transactions
  searchTerm = '';
  typeFilter = '';
  materialFilter = '';

  // Pagination
  currentPage = 1;
  pageSize = 8;
  totalPages = 1;
  pagedTransactions: InventoryTransaction[] = [];

  // Modal State
  showOperationModal = false;
  operationType: InventoryTransactionType = 'Receipt';
  operationForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.operationForm = this.fb.group({
      materialId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      productionOrderId: [''],
      notes: ['', Validators.required]
    });
  }

  loadData(): void {
    this.materials = this.dataService.getRawMaterials();
    this.transactions = this.dataService.getInventoryTransactions().sort((a, b) =>
      new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
    );
    this.productionOrders = this.dataService.getProductionOrders().filter(o => o.status !== 'Cancelled');

    this.calculateKPIs();
    this.applyFilters();
  }

  calculateKPIs(): void {
    this.totalMaterials = this.materials.length;
    this.lowStockCount = this.materials.filter(m => m.availableStock <= m.minimumStockLevel).length;
    this.totalStockValue = this.materials.reduce((sum, m) => sum + (m.availableStock * m.unitCost), 0);
    this.totalTransactions = this.transactions.length;
  }

  get lowStockMaterials(): RawMaterial[] {
    return this.materials.filter(m => m.availableStock <= m.minimumStockLevel);
  }

  applyFilters(): void {
    let result = [...this.transactions];
    const term = this.searchTerm.toLowerCase().trim();

    if (term) {
      result = result.filter(t =>
        t.materialName.toLowerCase().includes(term) ||
        (t.notes && t.notes.toLowerCase().includes(term)) ||
        (t.productionOrderId && t.productionOrderId.toLowerCase().includes(term))
      );
    }

    if (this.typeFilter) {
      result = result.filter(t => t.transactionType === this.typeFilter);
    }

    if (this.materialFilter) {
      result = result.filter(t => t.materialId === this.materialFilter);
    }

    this.filteredTransactions = result;
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    this.updatePage();
  }

  updatePage(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedTransactions = this.filteredTransactions.slice(start, start + this.pageSize);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
      this.updatePage();
    }
  }

  getPages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  openOperationModal(type: InventoryTransactionType): void {
    this.operationType = type;
    this.operationForm.reset({
      materialId: this.materials.length > 0 ? this.materials[0].id : '',
      quantity: 1,
      productionOrderId: '',
      notes: ''
    });
    this.showOperationModal = true;
  }

  closeOperationModal(): void {
    this.showOperationModal = false;
  }

  getSelectedMaterial(): RawMaterial | undefined {
    const id = this.operationForm.get('materialId')?.value;
    return this.materials.find(m => m.id === id);
  }

  executeOperation(): void {
    if (this.operationForm.invalid) {
      this.operationForm.markAllAsTouched();
      return;
    }

    const formVal = this.operationForm.value;
    const material = this.materials.find(m => m.id === formVal.materialId);
    if (!material) return;

    const qty = Number(formVal.quantity);

    // Business rule checks
    if (this.operationType === 'Consumption') {
      if (material.availableStock < qty) {
        this.notificationService.error(`Insufficient stock! Available: ${material.availableStock} ${material.unit}`);
        return;
      }
    } else if (this.operationType === 'Reservation') {
      if ((material.availableStock - material.reservedStock) < qty) {
        this.notificationService.error(`Insufficient unreserved stock! Available to reserve: ${material.availableStock - material.reservedStock} ${material.unit}`);
        return;
      }
    } else if (this.operationType === 'Adjustment') {
      if (qty < 0 && Math.abs(qty) > material.availableStock) {
        this.notificationService.error(`Cannot reduce stock below 0! Current: ${material.availableStock} ${material.unit}`);
        return;
      }
    }

    // Apply change
    if (this.operationType === 'Receipt') {
      this.dataService.updateMaterialStock(material.id, qty);
    } else if (this.operationType === 'Consumption') {
      this.dataService.updateMaterialStock(material.id, -qty);
    } else if (this.operationType === 'Adjustment') {
      this.dataService.updateMaterialStock(material.id, qty);
    } else if (this.operationType === 'Reservation') {
      this.dataService.updateMaterialReservation(material.id, qty);
    }

    // Create transaction record
    const transaction: InventoryTransaction = {
      id: this.dataService.generateId('IT'),
      materialId: material.id,
      materialName: material.name,
      transactionType: this.operationType,
      quantity: (this.operationType === 'Consumption') ? -qty : qty,
      productionOrderId: formVal.productionOrderId || undefined,
      notes: formVal.notes,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    this.dataService.addInventoryTransaction(transaction);
    this.notificationService.success(`${this.operationType} of ${qty} ${material.unit} completed.`);
    this.closeOperationModal();
    this.loadData();
  }

  getTransactionBadgeClass(type: InventoryTransactionType): string {
    switch (type) {
      case 'Receipt': return 'badge badge-completed';
      case 'Consumption': return 'badge badge-cancelled';
      case 'Adjustment': return 'badge badge-on-hold';
      case 'Reservation': return 'badge badge-in-progress';
      case 'Release': return 'badge badge-planned';
      default: return 'badge';
    }
  }

  isFieldInvalid(field: string): boolean {
    const c = this.operationForm.get(field);
    return !!(c && c.invalid && c.touched);
  }
}
