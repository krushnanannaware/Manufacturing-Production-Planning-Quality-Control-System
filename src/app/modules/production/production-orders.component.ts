import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { ProductionOrder, WorkCentre } from '../../core/models/interfaces';

@Component({
  selector: 'app-production-orders',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './production-orders.component.html',
  styleUrl: './production-orders.component.css'
})
export class ProductionOrdersComponent implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);

  orders: ProductionOrder[] = [];
  filteredOrders: ProductionOrder[] = [];
  pagedOrders: ProductionOrder[] = [];
  workCentres: WorkCentre[] = [];

  searchTerm = '';
  statusFilter = '';
  priorityFilter = '';
  sortDirection: 'asc' | 'desc' = 'desc';

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  showDeleteConfirm = false;
  orderToDelete: ProductionOrder | null = null;

  showViewModal = false;
  selectedOrder: ProductionOrder | null = null;
  selectedOrderBOMRequirements: { materialId: string; materialName: string; required: number; available: number; reserved: number; shortage: number; unit: string }[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.orders = this.dataService.getProductionOrders();
    this.workCentres = this.dataService.getWorkCentres();
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.orders];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(o =>
        o.productName.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term)
      );
    }

    if (this.statusFilter) {
      result = result.filter(o => o.status === this.statusFilter);
    }

    if (this.priorityFilter) {
      result = result.filter(o => o.priority === this.priorityFilter);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.plannedStartDate).getTime();
      const dateB = new Date(b.plannedStartDate).getTime();
      return this.sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

    this.filteredOrders = result;
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    this.updatePage();
  }

  updatePage(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedOrders = this.filteredOrders.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePage();
    }
  }

  getPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  getWorkCentreName(id?: string): string {
    if (!id) return '—';
    const wc = this.workCentres.find(w => w.id === id);
    return wc ? wc.name : '—';
  }

  getProgressPercent(order: ProductionOrder): number {
    if (order.quantity === 0) return 0;
    return Math.round((order.producedQuantity / order.quantity) * 100);
  }

  getProgressColor(percent: number): string {
    if (percent >= 100) return 'green';
    if (percent >= 50) return 'blue';
    if (percent > 0) return 'orange';
    return 'blue';
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'Planned': 'badge-planned',
      'In Progress': 'badge-in-progress',
      'Completed': 'badge-completed',
      'On Hold': 'badge-on-hold',
      'Cancelled': 'badge-cancelled'
    };
    return 'badge ' + (map[status] || 'badge-planned');
  }

  getPriorityBadgeClass(priority: string): string {
    return 'badge badge-' + priority.toLowerCase();
  }

  confirmDelete(order: ProductionOrder): void {
    this.orderToDelete = order;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.orderToDelete = null;
  }

  deleteOrder(): void {
    if (!this.orderToDelete) return;
    const result = this.dataService.deleteProductionOrder(this.orderToDelete.id);
    if (result.success) {
      this.notificationService.success(result.message);
      this.loadData();
    } else {
      this.notificationService.error(result.message);
    }
    this.showDeleteConfirm = false;
    this.orderToDelete = null;
  }

  openViewModal(order: ProductionOrder): void {
    this.selectedOrder = order;
    this.selectedOrderBOMRequirements = this.dataService.calculateMaterialRequirements(order.productId, order.quantity);
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedOrder = null;
  }

  consumeMaterials(order: ProductionOrder): void {
    const res = this.dataService.consumeMaterialsForOrder(order.id);
    if (res.success) {
      this.notificationService.success(res.message);
      this.loadData();
      if (this.selectedOrder && this.selectedOrder.id === order.id) {
        this.selectedOrder = this.dataService.getProductionOrder(order.id) || null;
        this.selectedOrderBOMRequirements = this.dataService.calculateMaterialRequirements(order.productId, order.quantity);
      }
    } else {
      this.notificationService.error(res.message);
    }
  }

  reserveMaterials(order: ProductionOrder): void {
    const res = this.dataService.reserveMaterialsForOrder(order.id);
    if (res.success) {
      this.notificationService.success(res.message);
      this.loadData();
      if (this.selectedOrder && this.selectedOrder.id === order.id) {
        this.selectedOrderBOMRequirements = this.dataService.calculateMaterialRequirements(order.productId, order.quantity);
      }
    } else {
      this.notificationService.error(res.message);
    }
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}
