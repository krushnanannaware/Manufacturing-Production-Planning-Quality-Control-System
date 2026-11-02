import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { BillOfMaterials, BomMaterial, RawMaterial, FinishedProduct } from '../../core/models/interfaces';

@Component({
  selector: 'app-bom',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './bom.component.html',
  styleUrls: ['./bom.component.css']
})
export class BomComponent implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  boms: BillOfMaterials[] = [];
  finishedProducts: FinishedProduct[] = [];
  rawMaterials: RawMaterial[] = [];

  expandedBomId: string | null = null;

  // Modal state
  showModal = false;
  isEditing = false;
  editingBomId: string | null = null;
  bomForm!: FormGroup;
  bomMaterials: BomMaterial[] = [];
  selectedMaterialId = '';
  materialQuantity = 1;
  duplicateProductError = '';

  // Delete state
  showDeleteConfirm = false;
  deletingBom: BillOfMaterials | null = null;

  // Material requirements calculator
  showCalculator = false;
  calcProductId = '';
  calcQuantity = 1;
  calcResults: { materialId: string; materialName: string; required: number; available: number; reserved: number; shortage: number; unit: string }[] = [];

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.bomForm = this.fb.group({
      productId: ['', Validators.required]
    });
  }

  loadData(): void {
    this.boms = this.dataService.getBoms();
    this.finishedProducts = this.dataService.getFinishedProducts();
    this.rawMaterials = this.dataService.getRawMaterials();
  }

  toggleExpand(bomId: string): void {
    this.expandedBomId = this.expandedBomId === bomId ? null : bomId;
  }

  getBomTotalCost(bom: BillOfMaterials): number {
    return bom.materials.reduce((sum, m) => {
      const raw = this.rawMaterials.find(r => r.id === m.materialId);
      return sum + (m.quantityRequired * (raw ? raw.unitCost : 0));
    }, 0);
  }

  getMaterialUnitCost(materialId: string): number {
    const raw = this.rawMaterials.find(r => r.id === materialId);
    return raw ? raw.unitCost : 0;
  }

  // Modal operations
  openCreateModal(): void {
    this.isEditing = false;
    this.editingBomId = null;
    this.bomForm.reset({ productId: '' });
    this.bomMaterials = [];
    this.selectedMaterialId = '';
    this.materialQuantity = 1;
    this.duplicateProductError = '';
    this.showModal = true;
  }

  openEditModal(bom: BillOfMaterials): void {
    this.isEditing = true;
    this.editingBomId = bom.id;
    this.bomForm.patchValue({ productId: bom.productId });
    this.bomMaterials = bom.materials.map(m => ({ ...m }));
    this.selectedMaterialId = '';
    this.materialQuantity = 1;
    this.duplicateProductError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.bomForm.reset();
    this.bomMaterials = [];
    this.duplicateProductError = '';
  }

  getAvailableProducts(): FinishedProduct[] {
    if (this.isEditing) {
      return this.finishedProducts;
    }
    const usedProductIds = this.boms.map(b => b.productId);
    return this.finishedProducts.filter(p => !usedProductIds.includes(p.id));
  }

  getAvailableMaterials(): RawMaterial[] {
    const usedIds = this.bomMaterials.map(m => m.materialId);
    return this.rawMaterials.filter(m => !usedIds.includes(m.id));
  }

  addMaterialToBom(): void {
    if (!this.selectedMaterialId || this.materialQuantity <= 0) return;

    const material = this.rawMaterials.find(m => m.id === this.selectedMaterialId);
    if (!material) return;

    if (this.bomMaterials.some(m => m.materialId === this.selectedMaterialId)) {
      this.notificationService.warning('Material already added to this BOM.');
      return;
    }

    this.bomMaterials.push({
      materialId: material.id,
      materialName: material.name,
      quantityRequired: this.materialQuantity,
      unit: material.unit
    });

    this.selectedMaterialId = '';
    this.materialQuantity = 1;
  }

  removeMaterialFromBom(index: number): void {
    this.bomMaterials.splice(index, 1);
  }

  onProductChange(): void {
    this.duplicateProductError = '';
    const productId = this.bomForm.get('productId')?.value;
    if (productId && !this.isEditing) {
      const existing = this.dataService.getBomByProduct(productId);
      if (existing) {
        this.duplicateProductError = 'A BOM already exists for this product.';
      }
    }
  }

  saveBom(): void {
    if (this.bomForm.invalid) {
      this.bomForm.markAllAsTouched();
      return;
    }

    if (this.duplicateProductError) return;

    if (this.bomMaterials.length === 0) {
      this.notificationService.error('Please add at least one material to the BOM.');
      return;
    }

    const productId = this.bomForm.get('productId')?.value;
    const product = this.finishedProducts.find(p => p.id === productId);

    if (!product) {
      this.notificationService.error('Invalid product selected.');
      return;
    }

    // Check for duplicate (only on create)
    if (!this.isEditing) {
      const existing = this.dataService.getBomByProduct(productId);
      if (existing) {
        this.notificationService.error('A BOM already exists for this product.');
        return;
      }
    }

    const bom: BillOfMaterials = {
      id: this.isEditing ? this.editingBomId! : this.dataService.generateId('BOM'),
      productId: product.id,
      productName: product.name,
      materials: [...this.bomMaterials],
      createdAt: this.isEditing
        ? (this.dataService.getBom(this.editingBomId!)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.dataService.saveBom(bom);
    this.notificationService.success(
      this.isEditing ? 'BOM updated successfully.' : 'BOM created successfully.'
    );
    this.closeModal();
    this.loadData();
  }

  // Delete
  confirmDelete(bom: BillOfMaterials): void {
    this.deletingBom = bom;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingBom = null;
  }

  deleteBom(): void {
    if (!this.deletingBom) return;
    const result = this.dataService.deleteBom(this.deletingBom.id);
    if (result.success) {
      this.notificationService.success(result.message);
      this.loadData();
    } else {
      this.notificationService.error(result.message);
    }
    this.cancelDelete();
  }

  // Material Requirements Calculator
  openCalculator(): void {
    this.showCalculator = true;
    this.calcProductId = '';
    this.calcQuantity = 1;
    this.calcResults = [];
  }

  closeCalculator(): void {
    this.showCalculator = false;
    this.calcResults = [];
  }

  calculateRequirements(): void {
    if (!this.calcProductId || this.calcQuantity <= 0) return;
    this.calcResults = this.dataService.calculateMaterialRequirements(this.calcProductId, this.calcQuantity);
    if (this.calcResults.length === 0) {
      this.notificationService.warning('No BOM found for the selected product.');
    }
  }

  getProductsWithBom(): FinishedProduct[] {
    return this.finishedProducts.filter(p => this.boms.some(b => b.productId === p.id));
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.bomForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}
