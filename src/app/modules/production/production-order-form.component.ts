import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { ProductionOrder, FinishedProduct, WorkCentre } from '../../core/models/interfaces';

@Component({
  selector: 'app-production-order-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './production-order-form.component.html',
  styleUrls: ['./production-order-form.component.css']
})
export class ProductionOrderFormComponent implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  orderForm!: FormGroup;
  isEditMode = false;
  orderId = '';
  existingOrder: ProductionOrder | null = null;

  finishedProducts: FinishedProduct[] = [];
  workCentres: WorkCentre[] = [];
  materialRequirements: { materialId: string; materialName: string; required: number; available: number; reserved: number; shortage: number; unit: string }[] = [];

  ngOnInit(): void {
    this.finishedProducts = this.dataService.getFinishedProducts();
    this.workCentres = this.dataService.getWorkCentres();

    this.orderForm = this.fb.group({
      productId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      priority: ['Medium', Validators.required],
      status: ['Planned', Validators.required],
      plannedStartDate: ['', Validators.required],
      plannedEndDate: ['', Validators.required],
      workCentreId: [''],
      notes: ['']
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.orderId = id;
      const order = this.dataService.getProductionOrder(id);
      if (order) {
        this.existingOrder = order;
        this.orderForm.patchValue({
          productId: order.productId,
          quantity: order.quantity,
          priority: order.priority,
          status: order.status,
          plannedStartDate: order.plannedStartDate,
          plannedEndDate: order.plannedEndDate,
          workCentreId: order.workCentreId || '',
          notes: order.notes
        });
        this.calculateRequirements();
      } else {
        this.notificationService.error('Production order not found.');
        this.router.navigate(['/production/orders']);
      }
    }

    // Watch product and quantity changes for material requirements
    this.orderForm.get('productId')?.valueChanges.subscribe(() => this.calculateRequirements());
    this.orderForm.get('quantity')?.valueChanges.subscribe(() => this.calculateRequirements());
  }

  calculateRequirements(): void {
    const productId = this.orderForm.get('productId')?.value;
    const quantity = this.orderForm.get('quantity')?.value;
    if (productId && quantity > 0) {
      this.materialRequirements = this.dataService.calculateMaterialRequirements(productId, quantity);
    } else {
      this.materialRequirements = [];
    }
  }

  hasShortage(): boolean {
    return this.materialRequirements.some(m => m.shortage > 0);
  }

  getSelectedProductName(): string {
    const productId = this.orderForm.get('productId')?.value;
    const product = this.finishedProducts.find(p => p.id === productId);
    return product ? product.name : '';
  }

  isDateInvalid(): boolean {
    const start = this.orderForm.get('plannedStartDate')?.value;
    const end = this.orderForm.get('plannedEndDate')?.value;
    if (start && end) {
      return new Date(end) <= new Date(start);
    }
    return false;
  }

  onSubmit(): void {
    if (this.orderForm.invalid) {
      Object.keys(this.orderForm.controls).forEach(key => {
        this.orderForm.get(key)?.markAsTouched();
      });
      return;
    }

    if (this.isDateInvalid()) {
      this.notificationService.error('End date must be after start date.');
      return;
    }

    const formVal = this.orderForm.value;
    const productName = this.getSelectedProductName();

    const order: ProductionOrder = {
      id: this.isEditMode ? this.orderId : this.dataService.generateId('PO'),
      productId: formVal.productId,
      productName: productName,
      quantity: formVal.quantity,
      producedQuantity: this.existingOrder?.producedQuantity ?? 0,
      acceptedQuantity: this.existingOrder?.acceptedQuantity ?? 0,
      rejectedQuantity: this.existingOrder?.rejectedQuantity ?? 0,
      priority: formVal.priority,
      status: formVal.status,
      plannedStartDate: formVal.plannedStartDate,
      plannedEndDate: formVal.plannedEndDate,
      actualStartDate: this.existingOrder?.actualStartDate,
      actualEndDate: this.existingOrder?.actualEndDate,
      workCentreId: formVal.workCentreId || undefined,
      notes: formVal.notes || '',
      materialsConsumed: this.existingOrder?.materialsConsumed ?? false,
      createdAt: this.existingOrder?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.dataService.saveProductionOrder(order);
    this.notificationService.success(this.isEditMode ? 'Production order updated successfully.' : 'Production order created successfully.');
    this.router.navigate(['/production/orders']);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.orderForm.get(field);
    return !!(control && control.invalid && control.touched);
  }
}
