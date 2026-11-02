import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  CorrectiveAction, CorrectiveActionStatus, Defect
} from '../../core/models/interfaces';

@Component({
  selector: 'app-corrective-actions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './corrective-actions.component.html',
  styleUrl: './corrective-actions.component.css'
})
export class CorrectiveActionsComponent implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  actions: CorrectiveAction[] = [];
  filteredActions: CorrectiveAction[] = [];
  defects: Defect[] = [];

  // KPIs
  totalActions = 0;
  pendingCount = 0;
  inProgressCount = 0;
  completedCount = 0;
  overdueCount = 0;

  // Filters
  searchTerm = '';
  statusFilter = '';

  // Form Modal
  showModal = false;
  isEditing = false;
  editingId = '';
  actionForm!: FormGroup;

  // View Details Modal
  showViewModal = false;
  selectedAction: CorrectiveAction | null = null;
  linkedDefect: Defect | null = null;

  // Delete
  showDeleteConfirm = false;
  deletingAction: CorrectiveAction | null = null;

  statuses: CorrectiveActionStatus[] = [
    'Pending',
    'In Progress',
    'Completed',
    'Verified',
    'Closed'
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.actionForm = this.fb.group({
      defectId: ['', Validators.required],
      description: ['', Validators.required],
      assignedTo: ['', Validators.required],
      targetDate: ['', Validators.required],
      status: ['Pending', Validators.required],
      completedDate: [''],
      resolutionDetails: ['']
    });

    this.actionForm.get('status')?.valueChanges.subscribe(status => {
      const compDate = this.actionForm.get('completedDate');
      const resDetails = this.actionForm.get('resolutionDetails');
      if (status === 'Completed' || status === 'Verified' || status === 'Closed') {
        if (!compDate?.value) {
          compDate?.setValue(new Date().toISOString().split('T')[0]);
        }
        resDetails?.setValidators([Validators.required]);
      } else {
        resDetails?.clearValidators();
      }
      resDetails?.updateValueAndValidity();
    });
  }

  loadData(): void {
    this.actions = this.dataService.getCorrectiveActions();
    this.defects = this.dataService.getDefects();

    this.calculateKPIs();
    this.applyFilters();
  }

  calculateKPIs(): void {
    this.totalActions = this.actions.length;
    this.pendingCount = this.actions.filter(a => a.status === 'Pending').length;
    this.inProgressCount = this.actions.filter(a => a.status === 'In Progress').length;
    this.completedCount = this.actions.filter(a => a.status === 'Completed' || a.status === 'Verified' || a.status === 'Closed').length;
    this.overdueCount = this.actions.filter(a => this.isOverdue(a)).length;
  }

  isOverdue(action: CorrectiveAction): boolean {
    if (action.status === 'Completed' || action.status === 'Verified' || action.status === 'Closed') {
      return false;
    }
    const today = new Date().toISOString().split('T')[0];
    return action.targetDate < today;
  }

  applyFilters(): void {
    let result = [...this.actions];
    const term = this.searchTerm.toLowerCase().trim();

    if (term) {
      result = result.filter(a =>
        a.id.toLowerCase().includes(term) ||
        a.defectId.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term) ||
        a.assignedTo.toLowerCase().includes(term)
      );
    }

    if (this.statusFilter) {
      result = result.filter(a => a.status === this.statusFilter);
    }

    this.filteredActions = result;
  }

  getDefectDisplay(defectId: string): string {
    const defect = this.defects.find(d => d.id === defectId);
    return defect ? `${defect.id} - ${defect.productName} (${defect.defectType})` : defectId;
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.editingId = '';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);

    this.actionForm.reset({
      defectId: this.defects.length > 0 ? this.defects[0].id : '',
      description: '',
      assignedTo: '',
      targetDate: tomorrow.toISOString().split('T')[0],
      status: 'Pending',
      completedDate: '',
      resolutionDetails: ''
    });
    this.showModal = true;
  }

  openEditModal(action: CorrectiveAction): void {
    this.isEditing = true;
    this.editingId = action.id;
    this.actionForm.patchValue({
      defectId: action.defectId,
      description: action.description,
      assignedTo: action.assignedTo,
      targetDate: action.targetDate,
      status: action.status,
      completedDate: action.completedDate || '',
      resolutionDetails: action.resolutionDetails || ''
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveAction(): void {
    if (this.actionForm.invalid) {
      this.actionForm.markAllAsTouched();
      return;
    }

    const val = this.actionForm.value;

    const action: CorrectiveAction = {
      id: this.isEditing ? this.editingId : this.dataService.generateId('CA'),
      defectId: val.defectId,
      description: val.description,
      assignedTo: val.assignedTo,
      targetDate: val.targetDate,
      status: val.status,
      completedDate: val.completedDate || undefined,
      resolutionDetails: val.resolutionDetails || '',
      createdAt: this.isEditing ? (this.dataService.getCorrectiveAction(this.editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.dataService.saveCorrectiveAction(action);
    this.notificationService.success(this.isEditing ? 'Corrective action updated.' : 'Corrective action initiated.');
    this.closeModal();
    this.loadData();
  }

  openViewModal(action: CorrectiveAction): void {
    this.selectedAction = action;
    this.linkedDefect = this.defects.find(d => d.id === action.defectId) || null;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedAction = null;
    this.linkedDefect = null;
  }

  confirmDelete(action: CorrectiveAction): void {
    this.deletingAction = action;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingAction = null;
  }

  deleteAction(): void {
    if (!this.deletingAction) return;
    this.dataService.deleteCorrectiveAction(this.deletingAction.id);
    this.notificationService.success('Corrective action deleted.');
    this.cancelDelete();
    this.loadData();
  }

  getStatusBadgeClass(status: CorrectiveActionStatus): string {
    switch (status) {
      case 'Pending': return 'badge badge-pending';
      case 'In Progress': return 'badge badge-in-progress';
      case 'Completed': return 'badge badge-completed';
      case 'Verified': return 'badge badge-verified';
      case 'Closed': return 'badge badge-closed';
      default: return 'badge';
    }
  }

  isFieldInvalid(field: string): boolean {
    const c = this.actionForm.get(field);
    return !!(c && c.invalid && c.touched);
  }
}
