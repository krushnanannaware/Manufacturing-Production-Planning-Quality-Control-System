import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  Defect, DefectSeverity, DefectStatus, ProductionOrder, QualityInspection, CorrectiveAction
} from '../../core/models/interfaces';

@Component({
  selector: 'app-defects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './defects.component.html',
  styleUrl: './defects.component.css'
})
export class DefectsComponent implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  defects: Defect[] = [];
  filteredDefects: Defect[] = [];
  orders: ProductionOrder[] = [];
  inspections: QualityInspection[] = [];
  correctiveActions: CorrectiveAction[] = [];

  // KPIs
  totalDefects = 0;
  openCount = 0;
  investigatingCount = 0;
  resolvedCount = 0;
  closedCount = 0;

  // Filters
  searchTerm = '';
  statusFilter = '';
  severityFilter = '';

  // Stats / Breakdown
  typeBreakdown: { type: string; count: number; percentage: number }[] = [];
  severityBreakdown: { severity: string; count: number; percentage: number }[] = [];

  // Modal
  showModal = false;
  isEditing = false;
  editingId = '';
  defectForm!: FormGroup;

  // View details modal
  showViewModal = false;
  selectedDefect: Defect | null = null;
  linkedCorrectiveActions: CorrectiveAction[] = [];

  // Delete
  showDeleteConfirm = false;
  deletingDefect: Defect | null = null;

  defectTypes = [
    'Dimensional',
    'Surface',
    'Structural',
    'Electrical',
    'Material',
    'Assembly',
    'Packaging',
    'Other'
  ];

  severities: DefectSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
  statuses: DefectStatus[] = ['Open', 'Under Investigation', 'Resolved', 'Closed'];

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.defectForm = this.fb.group({
      productionOrderId: ['', Validators.required],
      inspectionId: [''],
      defectType: ['Dimensional', Validators.required],
      severity: ['Medium', Validators.required],
      description: ['', Validators.required],
      affectedQuantity: [1, [Validators.required, Validators.min(1)]],
      status: ['Open', Validators.required],
      reportedDate: [new Date().toISOString().split('T')[0], Validators.required],
      resolutionNotes: ['']
    });

    this.defectForm.get('status')?.valueChanges.subscribe(status => {
      const resNotes = this.defectForm.get('resolutionNotes');
      if (status === 'Resolved' || status === 'Closed') {
        resNotes?.setValidators([Validators.required]);
      } else {
        resNotes?.clearValidators();
      }
      resNotes?.updateValueAndValidity();
    });
  }

  loadData(): void {
    this.defects = this.dataService.getDefects();
    this.orders = this.dataService.getProductionOrders();
    this.inspections = this.dataService.getInspections();
    this.correctiveActions = this.dataService.getCorrectiveActions();

    this.calculateKPIs();
    this.calculateBreakdowns();
    this.applyFilters();
  }

  calculateKPIs(): void {
    this.totalDefects = this.defects.length;
    this.openCount = this.defects.filter(d => d.status === 'Open').length;
    this.investigatingCount = this.defects.filter(d => d.status === 'Under Investigation').length;
    this.resolvedCount = this.defects.filter(d => d.status === 'Resolved').length;
    this.closedCount = this.defects.filter(d => d.status === 'Closed').length;
  }

  calculateBreakdowns(): void {
    const total = this.defects.length || 1;

    // Type breakdown
    const typeMap = new Map<string, number>();
    for (const d of this.defects) {
      typeMap.set(d.defectType, (typeMap.get(d.defectType) || 0) + 1);
    }
    this.typeBreakdown = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100)
    }));

    // Severity breakdown
    this.severityBreakdown = this.severities.map(sev => {
      const count = this.defects.filter(d => d.severity === sev).length;
      return {
        severity: sev,
        count,
        percentage: Math.round((count / total) * 100)
      };
    });
  }

  applyFilters(): void {
    let result = [...this.defects];
    const term = this.searchTerm.toLowerCase().trim();

    if (term) {
      result = result.filter(d =>
        d.id.toLowerCase().includes(term) ||
        d.productName.toLowerCase().includes(term) ||
        d.defectType.toLowerCase().includes(term) ||
        d.description.toLowerCase().includes(term)
      );
    }

    if (this.statusFilter) {
      result = result.filter(d => d.status === this.statusFilter);
    }

    if (this.severityFilter) {
      result = result.filter(d => d.severity === this.severityFilter);
    }

    this.filteredDefects = result;
  }

  getFilteredInspectionsForOrder(): QualityInspection[] {
    const orderId = this.defectForm.get('productionOrderId')?.value;
    if (!orderId) return [];
    return this.inspections.filter(i => i.productionOrderId === orderId);
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.editingId = '';
    this.defectForm.reset({
      productionOrderId: this.orders.length > 0 ? this.orders[0].id : '',
      inspectionId: '',
      defectType: 'Dimensional',
      severity: 'Medium',
      description: '',
      affectedQuantity: 1,
      status: 'Open',
      reportedDate: new Date().toISOString().split('T')[0],
      resolutionNotes: ''
    });
    this.showModal = true;
  }

  openEditModal(defect: Defect): void {
    this.isEditing = true;
    this.editingId = defect.id;
    this.defectForm.patchValue({
      productionOrderId: defect.productionOrderId,
      inspectionId: defect.inspectionId || '',
      defectType: defect.defectType,
      severity: defect.severity,
      description: defect.description,
      affectedQuantity: defect.affectedQuantity,
      status: defect.status,
      reportedDate: defect.reportedDate,
      resolutionNotes: defect.resolutionNotes || ''
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveDefect(): void {
    if (this.defectForm.invalid) {
      this.defectForm.markAllAsTouched();
      return;
    }

    const formVal = this.defectForm.value;
    const order = this.orders.find(o => o.id === formVal.productionOrderId);

    const defect: Defect = {
      id: this.isEditing ? this.editingId : this.dataService.generateId('DEF'),
      productionOrderId: formVal.productionOrderId,
      inspectionId: formVal.inspectionId || undefined,
      productName: order ? order.productName : 'Unknown Product',
      defectType: formVal.defectType,
      severity: formVal.severity,
      description: formVal.description,
      affectedQuantity: formVal.affectedQuantity,
      status: formVal.status,
      reportedDate: formVal.reportedDate,
      resolvedDate: (formVal.status === 'Resolved' || formVal.status === 'Closed')
        ? (this.isEditing ? (this.dataService.getDefect(this.editingId)?.resolvedDate || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0])
        : undefined,
      resolutionNotes: formVal.resolutionNotes || '',
      createdAt: this.isEditing ? (this.dataService.getDefect(this.editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.dataService.saveDefect(defect);
    this.notificationService.success(this.isEditing ? 'Defect record updated.' : 'Defect recorded successfully.');
    this.closeModal();
    this.loadData();
  }

  openViewModal(defect: Defect): void {
    this.selectedDefect = defect;
    this.linkedCorrectiveActions = this.correctiveActions.filter(ca => ca.defectId === defect.id);
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedDefect = null;
  }

  confirmDelete(defect: Defect): void {
    this.deletingDefect = defect;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingDefect = null;
  }

  deleteDefect(): void {
    if (!this.deletingDefect) return;
    const res = this.dataService.deleteDefect(this.deletingDefect.id);
    if (res.success) {
      this.notificationService.success(res.message);
      this.loadData();
    } else {
      this.notificationService.error(res.message);
    }
    this.cancelDelete();
  }

  getSeverityBadge(sev: string): string {
    return `badge badge-${sev.toLowerCase()}`;
  }

  getStatusBadge(st: string): string {
    switch (st) {
      case 'Open': return 'badge badge-open';
      case 'Under Investigation': return 'badge badge-under-investigation';
      case 'Resolved': return 'badge badge-resolved';
      case 'Closed': return 'badge badge-closed';
      default: return 'badge';
    }
  }

  isFieldInvalid(field: string): boolean {
    const c = this.defectForm.get(field);
    return !!(c && c.invalid && c.touched);
  }
}
