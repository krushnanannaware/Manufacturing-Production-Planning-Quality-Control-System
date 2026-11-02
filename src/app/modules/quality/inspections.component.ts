import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { QualityInspection, InspectionCheckpoint, ProductionOrder } from '../../core/models/interfaces';

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inspections.component.html',
  styleUrl: './inspections.component.css'
})
export class InspectionsComponent implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  inspections: QualityInspection[] = [];
  filteredInspections: QualityInspection[] = [];
  productionOrders: ProductionOrder[] = [];

  searchTerm = '';
  filterResult = '';

  // KPI
  totalInspections = 0;
  passedCount = 0;
  failedCount = 0;
  partialCount = 0;
  passRate = 0;

  // Modal
  showFormModal = false;
  showViewModal = false;
  isEditing = false;
  inspectionForm!: FormGroup;
  selectedInspection: QualityInspection | null = null;

  // Delete confirm
  showDeleteConfirm = false;
  deleteTarget: QualityInspection | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.inspectionForm = this.fb.group({
      id: [''],
      productionOrderId: ['', Validators.required],
      productName: [{ value: '', disabled: true }],
      batchNumber: ['', Validators.required],
      inspectionDate: ['', Validators.required],
      inspectorName: ['', Validators.required],
      checkpoints: this.fb.array([], Validators.minLength(1)),
      overallResult: ['Pass', Validators.required],
      notes: ['']
    });
  }

  get checkpoints(): FormArray {
    return this.inspectionForm.get('checkpoints') as FormArray;
  }

  createCheckpointGroup(cp?: InspectionCheckpoint): FormGroup {
    return this.fb.group({
      name: [cp?.name || '', Validators.required],
      description: [cp?.description || ''],
      result: [cp?.result || 'Pass', Validators.required],
      notes: [cp?.notes || '']
    });
  }

  addCheckpoint(): void {
    this.checkpoints.push(this.createCheckpointGroup());
  }

  removeCheckpoint(index: number): void {
    this.checkpoints.removeAt(index);
    this.autoCalculateResult();
  }

  autoCalculateResult(): void {
    const cps = this.checkpoints.value as InspectionCheckpoint[];
    const evaluated = cps.filter(c => c.result !== 'N/A');
    if (evaluated.length === 0) {
      this.inspectionForm.patchValue({ overallResult: 'Pass' });
      return;
    }
    const allPass = evaluated.every(c => c.result === 'Pass');
    const anyFail = evaluated.some(c => c.result === 'Fail');
    if (allPass) {
      this.inspectionForm.patchValue({ overallResult: 'Pass' });
    } else if (anyFail && !allPass) {
      const allFail = evaluated.every(c => c.result === 'Fail');
      this.inspectionForm.patchValue({ overallResult: allFail ? 'Fail' : 'Partial' });
    }
  }

  onCheckpointResultChange(): void {
    this.autoCalculateResult();
  }

  loadData(): void {
    this.inspections = this.dataService.getInspections();
    this.productionOrders = this.dataService.getProductionOrders().filter(o => o.status !== 'Cancelled');
    this.applyFilters();
    this.calculateKPIs();
  }

  calculateKPIs(): void {
    this.totalInspections = this.inspections.length;
    this.passedCount = this.inspections.filter(i => i.overallResult === 'Pass').length;
    this.failedCount = this.inspections.filter(i => i.overallResult === 'Fail').length;
    this.partialCount = this.inspections.filter(i => i.overallResult === 'Partial').length;
    this.passRate = this.totalInspections > 0 ? Math.round((this.passedCount / this.totalInspections) * 100) : 0;
  }

  applyFilters(): void {
    let result = [...this.inspections];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(i =>
        i.productName.toLowerCase().includes(term) ||
        i.inspectorName.toLowerCase().includes(term) ||
        i.batchNumber.toLowerCase().includes(term) ||
        i.id.toLowerCase().includes(term)
      );
    }
    if (this.filterResult) {
      result = result.filter(i => i.overallResult === this.filterResult);
    }
    this.filteredInspections = result;
  }

  onSearchChange(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.applyFilters();
  }

  onFilterChange(event: Event): void {
    this.filterResult = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  onOrderChange(event: Event): void {
    const orderId = (event.target as HTMLSelectElement).value;
    const order = this.productionOrders.find(o => o.id === orderId);
    this.inspectionForm.patchValue({ productName: order ? order.productName : '' });
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.inspectionForm.reset({ overallResult: 'Pass' });
    this.checkpoints.clear();
    this.addCheckpoint();
    this.showFormModal = true;
  }

  openEditModal(inspection: QualityInspection): void {
    this.isEditing = true;
    this.checkpoints.clear();
    inspection.checkpoints.forEach(cp => {
      this.checkpoints.push(this.createCheckpointGroup(cp));
    });
    this.inspectionForm.patchValue({
      id: inspection.id,
      productionOrderId: inspection.productionOrderId,
      productName: inspection.productName,
      batchNumber: inspection.batchNumber,
      inspectionDate: inspection.inspectionDate,
      inspectorName: inspection.inspectorName,
      overallResult: inspection.overallResult,
      notes: inspection.notes
    });
    this.showFormModal = true;
  }

  openViewModal(inspection: QualityInspection): void {
    this.selectedInspection = inspection;
    this.showViewModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedInspection = null;
  }

  saveInspection(): void {
    if (this.inspectionForm.invalid || this.checkpoints.length === 0) {
      this.inspectionForm.markAllAsTouched();
      if (this.checkpoints.length === 0) {
        this.notificationService.error('At least one checkpoint is required.');
      }
      return;
    }

    const formVal = this.inspectionForm.getRawValue();
    const order = this.productionOrders.find(o => o.id === formVal.productionOrderId);

    const inspection: QualityInspection = {
      id: this.isEditing ? formVal.id : this.dataService.generateId('QI'),
      productionOrderId: formVal.productionOrderId,
      productName: order ? order.productName : formVal.productName,
      batchNumber: formVal.batchNumber,
      inspectionDate: formVal.inspectionDate,
      inspectorName: formVal.inspectorName,
      checkpoints: formVal.checkpoints,
      overallResult: formVal.overallResult,
      notes: formVal.notes || '',
      createdAt: this.isEditing ? (this.inspections.find(i => i.id === formVal.id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.dataService.saveInspection(inspection);
    this.notificationService.success(this.isEditing ? 'Inspection updated successfully.' : 'Inspection created successfully.');
    this.closeFormModal();
    this.loadData();
  }

  confirmDelete(inspection: QualityInspection): void {
    this.deleteTarget = inspection;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteTarget = null;
  }

  deleteInspection(): void {
    if (!this.deleteTarget) return;
    const result = this.dataService.deleteInspection(this.deleteTarget.id);
    if (result.success) {
      this.notificationService.success(result.message);
    } else {
      this.notificationService.error(result.message);
    }
    this.showDeleteConfirm = false;
    this.deleteTarget = null;
    this.loadData();
  }

  getCheckpointSummary(inspection: QualityInspection): string {
    const pass = inspection.checkpoints.filter(c => c.result === 'Pass').length;
    const fail = inspection.checkpoints.filter(c => c.result === 'Fail').length;
    const na = inspection.checkpoints.filter(c => c.result === 'N/A').length;
    return `${pass}P / ${fail}F / ${na}N/A`;
  }

  getResultBadgeClass(result: string): string {
    switch (result) {
      case 'Pass': return 'badge badge-pass';
      case 'Fail': return 'badge badge-fail';
      case 'Partial': return 'badge badge-partial';
      default: return 'badge';
    }
  }

  getOrderDisplay(orderId: string): string {
    const order = this.dataService.getProductionOrder(orderId);
    return order ? `${order.id} - ${order.productName}` : orderId;
  }
}
