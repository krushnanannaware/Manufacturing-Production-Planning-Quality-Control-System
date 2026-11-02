import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { ProductionSchedule, ProductionOrder, WorkCentre } from '../../core/models/interfaces';

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './scheduling.component.html',
  styleUrl: './scheduling.component.css'
})
export class SchedulingComponent implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  schedules: ProductionSchedule[] = [];
  orders: ProductionOrder[] = [];
  workCentres: WorkCentre[] = [];
  unscheduledOrders: ProductionOrder[] = [];

  showModal = false;
  scheduleForm!: FormGroup;
  conflicts: ProductionSchedule[] = [];

  showDeleteConfirm = false;
  scheduleToDelete: ProductionSchedule | null = null;

  // Timeline
  timelineWorkCentres: { wc: WorkCentre; schedules: ProductionSchedule[] }[] = [];

  ngOnInit(): void {
    this.scheduleForm = this.fb.group({
      productionOrderId: ['', Validators.required],
      workCentreId: ['', Validators.required],
      scheduledStartDate: ['', Validators.required],
      scheduledEndDate: ['', Validators.required],
      notes: ['']
    });
    this.scheduleForm.get('workCentreId')?.valueChanges.subscribe(() => this.checkConflicts());
    this.scheduleForm.get('scheduledStartDate')?.valueChanges.subscribe(() => this.checkConflicts());
    this.scheduleForm.get('scheduledEndDate')?.valueChanges.subscribe(() => this.checkConflicts());
    this.loadData();
  }

  loadData(): void {
    this.schedules = this.dataService.getSchedules();
    this.orders = this.dataService.getProductionOrders();
    this.workCentres = this.dataService.getWorkCentres();
    const scheduledOrderIds = new Set(this.schedules.map(s => s.productionOrderId));
    this.unscheduledOrders = this.orders.filter(o => !scheduledOrderIds.has(o.id) && o.status !== 'Cancelled' && o.status !== 'Completed');
    this.buildTimeline();
  }

  buildTimeline(): void {
    this.timelineWorkCentres = this.workCentres.map(wc => ({
      wc,
      schedules: this.schedules.filter(s => s.workCentreId === wc.id).sort((a, b) =>
        new Date(a.scheduledStartDate).getTime() - new Date(b.scheduledStartDate).getTime()
      )
    })).filter(t => t.schedules.length > 0);
  }

  getOrderName(orderId: string): string {
    const order = this.orders.find(o => o.id === orderId);
    return order ? `${order.id} - ${order.productName}` : orderId;
  }

  getWorkCentreName(wcId: string): string {
    const wc = this.workCentres.find(w => w.id === wcId);
    return wc ? wc.name : wcId;
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      'Scheduled': 'badge badge-scheduled',
      'In Progress': 'badge badge-in-progress',
      'Completed': 'badge badge-completed',
      'Delayed': 'badge badge-delayed',
      'Cancelled': 'badge badge-cancelled'
    };
    return map[status] || 'badge badge-scheduled';
  }

  openCreateModal(): void {
    this.scheduleForm.reset();
    this.conflicts = [];
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  checkConflicts(): void {
    const wcId = this.scheduleForm.get('workCentreId')?.value;
    const start = this.scheduleForm.get('scheduledStartDate')?.value;
    const end = this.scheduleForm.get('scheduledEndDate')?.value;
    if (wcId && start && end) {
      this.conflicts = this.dataService.checkScheduleConflicts(wcId, start, end);
    } else {
      this.conflicts = [];
    }
  }

  saveSchedule(): void {
    if (this.scheduleForm.invalid) {
      Object.keys(this.scheduleForm.controls).forEach(k => this.scheduleForm.get(k)?.markAsTouched());
      return;
    }
    const val = this.scheduleForm.value;
    if (new Date(val.scheduledEndDate) <= new Date(val.scheduledStartDate)) {
      this.notificationService.error('End date must be after start date.');
      return;
    }
    const schedule: ProductionSchedule = {
      id: this.dataService.generateId('SCH'),
      productionOrderId: val.productionOrderId,
      workCentreId: val.workCentreId,
      scheduledStartDate: val.scheduledStartDate,
      scheduledEndDate: val.scheduledEndDate,
      status: 'Scheduled',
      notes: val.notes || '',
      createdAt: new Date().toISOString()
    };
    this.dataService.saveSchedule(schedule);
    // Update the production order with the work centre assignment
    const order = this.dataService.getProductionOrder(val.productionOrderId);
    if (order) {
      order.workCentreId = val.workCentreId;
      this.dataService.saveProductionOrder(order);
    }
    this.notificationService.success('Schedule created successfully.');
    this.closeModal();
    this.loadData();
  }

  updateStatus(schedule: ProductionSchedule, newStatus: string): void {
    schedule.status = newStatus as ProductionSchedule['status'];
    if (newStatus === 'In Progress') {
      schedule.actualStartDate = new Date().toISOString().split('T')[0];
    }
    if (newStatus === 'Completed') {
      schedule.actualEndDate = new Date().toISOString().split('T')[0];
    }
    this.dataService.saveSchedule(schedule);
    this.notificationService.success(`Schedule status updated to ${newStatus}.`);
    this.loadData();
  }

  confirmDelete(s: ProductionSchedule): void {
    this.scheduleToDelete = s;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.scheduleToDelete = null;
  }

  deleteSchedule(): void {
    if (!this.scheduleToDelete) return;
    this.dataService.deleteSchedule(this.scheduleToDelete.id);
    this.notificationService.success('Schedule deleted.');
    this.cancelDelete();
    this.loadData();
  }

  formatDate(date: string | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  isFieldInvalid(field: string): boolean {
    const c = this.scheduleForm.get(field);
    return !!(c && c.invalid && c.touched);
  }
}

