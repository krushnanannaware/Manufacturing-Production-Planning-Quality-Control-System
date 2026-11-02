import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { WorkCentre, ProductionOrder } from '../../core/models/interfaces';

@Component({
  selector: 'app-work-centres',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './work-centres.component.html',
  styleUrl: './work-centres.component.css'
})
export class WorkCentresComponent implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  workCentres: WorkCentre[] = [];
  filteredCentres: WorkCentre[] = [];
  orders: ProductionOrder[] = [];
  searchTerm = '';
  typeFilter = '';
  machineTypes: string[] = [];

  showModal = false;
  isEditMode = false;
  wcForm!: FormGroup;
  editingId = '';

  showDeleteConfirm = false;
  centreToDelete: WorkCentre | null = null;

  ngOnInit(): void {
    this.wcForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      machineType: ['', Validators.required],
      capacity: [100, [Validators.required, Validators.min(1)]],
      capacityUnit: ['units/day', Validators.required],
      location: [''],
      operatingHours: [''],
      maintenanceSchedule: [''],
      isAvailable: [true]
    });
    this.loadData();
  }

  loadData(): void {
    this.workCentres = this.dataService.getWorkCentres();
    this.orders = this.dataService.getProductionOrders();
    this.machineTypes = [...new Set(this.workCentres.map(w => w.machineType))];
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.workCentres];
    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      result = result.filter(w => w.name.toLowerCase().includes(t) || w.id.toLowerCase().includes(t));
    }
    if (this.typeFilter) {
      result = result.filter(w => w.machineType === this.typeFilter);
    }
    this.filteredCentres = result;
  }

  getAssignedOrders(wcId: string): number {
    return this.orders.filter(o => o.workCentreId === wcId && (o.status === 'Planned' || o.status === 'In Progress')).length;
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.editingId = '';
    this.wcForm.reset({ capacity: 100, capacityUnit: 'units/day', isAvailable: true });
    this.showModal = true;
  }

  openEditModal(wc: WorkCentre): void {
    this.isEditMode = true;
    this.editingId = wc.id;
    this.wcForm.patchValue(wc);
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveWorkCentre(): void {
    if (this.wcForm.invalid) {
      Object.keys(this.wcForm.controls).forEach(k => this.wcForm.get(k)?.markAsTouched());
      return;
    }
    const val = this.wcForm.value;
    const wc: WorkCentre = {
      id: this.isEditMode ? this.editingId : this.dataService.generateId('WC'),
      name: val.name,
      description: val.description || '',
      machineType: val.machineType,
      capacity: val.capacity,
      capacityUnit: val.capacityUnit,
      isAvailable: val.isAvailable,
      location: val.location || '',
      operatingHours: val.operatingHours || '',
      maintenanceSchedule: val.maintenanceSchedule || '',
      createdAt: this.isEditMode ? (this.dataService.getWorkCentre(this.editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.dataService.saveWorkCentre(wc);
    this.notificationService.success(this.isEditMode ? 'Work centre updated.' : 'Work centre created.');
    this.closeModal();
    this.loadData();
  }

  toggleAvailability(wc: WorkCentre): void {
    wc.isAvailable = !wc.isAvailable;
    this.dataService.saveWorkCentre(wc);
    this.notificationService.info(`${wc.name} is now ${wc.isAvailable ? 'Available' : 'Unavailable'}.`);
    this.loadData();
  }

  confirmDelete(wc: WorkCentre): void {
    this.centreToDelete = wc;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.centreToDelete = null;
  }

  deleteWorkCentre(): void {
    if (!this.centreToDelete) return;
    const result = this.dataService.deleteWorkCentre(this.centreToDelete.id);
    if (result.success) {
      this.notificationService.success(result.message);
    } else {
      this.notificationService.error(result.message);
    }
    this.cancelDelete();
    this.loadData();
  }

  isFieldInvalid(field: string): boolean {
    const c = this.wcForm.get(field);
    return !!(c && c.invalid && c.touched);
  }
}

