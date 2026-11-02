import { Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { RawMaterial } from '../../core/models/interfaces';

@Component({
  selector: 'app-raw-materials',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './raw-materials.component.html',
  styleUrl: './raw-materials.component.css'
})
export class RawMaterialsComponent implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  materials: RawMaterial[] = [];
  filteredMaterials: RawMaterial[] = [];
  categories: string[] = [];

  searchTerm = '';
  categoryFilter = '';

  showModal = false;
  isEditing = false;
  materialForm!: FormGroup;
  editingMaterialId: string | null = null;

  showDeleteConfirm = false;
  deletingMaterial: RawMaterial | null = null;

  // KPI values
  totalMaterials = 0;
  lowStockCount = 0;
  totalStockValue = 0;

  ngOnInit(): void {
    this.initForm();
    this.loadMaterials();
  }

  initForm(): void {
    this.materialForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      unit: ['', Validators.required],
      unitCost: [0, [Validators.required, Validators.min(0)]],
      supplierName: [''],
      supplierContact: [''],
      availableStock: [0, [Validators.required, Validators.min(0)]],
      minimumStockLevel: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadMaterials(): void {
    this.materials = this.dataService.getRawMaterials();
    this.categories = [...new Set(this.materials.map(m => m.category))].sort();
    this.calculateKPIs();
    this.applyFilters();
  }

  calculateKPIs(): void {
    this.totalMaterials = this.materials.length;
    this.lowStockCount = this.materials.filter(m => m.availableStock <= m.minimumStockLevel).length;
    this.totalStockValue = this.materials.reduce((sum, m) => sum + (m.availableStock * m.unitCost), 0);
  }

  applyFilters(): void {
    let result = [...this.materials];
    const term = this.searchTerm.toLowerCase().trim();

    if (term) {
      result = result.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.category.toLowerCase().includes(term) ||
        m.supplierName.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term)
      );
    }

    if (this.categoryFilter) {
      result = result.filter(m => m.category === this.categoryFilter);
    }

    this.filteredMaterials = result;
  }

  onSearchChange(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.applyFilters();
  }

  onCategoryFilterChange(event: Event): void {
    this.categoryFilter = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  isLowStock(material: RawMaterial): boolean {
    return material.availableStock <= material.minimumStockLevel;
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.editingMaterialId = null;
    this.materialForm.reset({
      name: '',
      category: '',
      unit: '',
      unitCost: 0,
      supplierName: '',
      supplierContact: '',
      availableStock: 0,
      minimumStockLevel: 0
    });
    this.showModal = true;
  }

  openEditModal(material: RawMaterial): void {
    this.isEditing = true;
    this.editingMaterialId = material.id;
    this.materialForm.patchValue({
      name: material.name,
      category: material.category,
      unit: material.unit,
      unitCost: material.unitCost,
      supplierName: material.supplierName,
      supplierContact: material.supplierContact,
      availableStock: material.availableStock,
      minimumStockLevel: material.minimumStockLevel
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.materialForm.reset();
  }

  saveMaterial(): void {
    if (this.materialForm.invalid) {
      this.materialForm.markAllAsTouched();
      return;
    }

    const formValue = this.materialForm.value;

    const material: RawMaterial = {
      id: this.isEditing ? this.editingMaterialId! : this.dataService.generateId('RM'),
      name: formValue.name,
      category: formValue.category,
      unit: formValue.unit,
      unitCost: formValue.unitCost,
      supplierName: formValue.supplierName || '',
      supplierContact: formValue.supplierContact || '',
      availableStock: formValue.availableStock,
      minimumStockLevel: formValue.minimumStockLevel,
      reservedStock: this.isEditing
        ? (this.dataService.getRawMaterial(this.editingMaterialId!)?.reservedStock || 0)
        : 0,
      createdAt: this.isEditing
        ? (this.dataService.getRawMaterial(this.editingMaterialId!)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.dataService.saveRawMaterial(material);
    this.notificationService.success(
      this.isEditing ? 'Material updated successfully.' : 'Material created successfully.'
    );
    this.closeModal();
    this.loadMaterials();
  }

  confirmDelete(material: RawMaterial): void {
    this.deletingMaterial = material;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingMaterial = null;
  }

  deleteMaterial(): void {
    if (!this.deletingMaterial) return;
    const result = this.dataService.deleteRawMaterial(this.deletingMaterial.id);
    if (result.success) {
      this.notificationService.success(result.message);
      this.loadMaterials();
    } else {
      this.notificationService.error(result.message);
    }
    this.cancelDelete();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.materialForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}
