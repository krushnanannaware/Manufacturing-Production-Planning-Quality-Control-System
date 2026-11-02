import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  DowntimeEvent, DowntimeCategory, WorkCentre
} from '../../core/models/interfaces';

@Component({
  selector: 'app-downtime',
  standalone: true,
  imports: [CommonModule, DatePipe, ReactiveFormsModule, FormsModule],
  templateUrl: './downtime.component.html',
  styleUrl: './downtime.component.css'
})
export class DowntimeComponent implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  downtimeEvents: DowntimeEvent[] = [];
  filteredEvents: DowntimeEvent[] = [];
  workCentres: WorkCentre[] = [];

  // KPIs
  totalEvents = 0;
  totalDowntimeMinutes = 0;
  activeDowntimeCount = 0;
  avgDurationMinutes = 0;

  // Filters
  searchTerm = '';
  categoryFilter = '';
  workCentreFilter = '';

  // Visual Breakdown Charts
  wcDowntimes: { name: string; minutes: number; count: number; percentage: number }[] = [];
  categoryDowntimes: { category: string; minutes: number; count: number; percentage: number }[] = [];

  // Modal
  showModal = false;
  isEditing = false;
  editingId = '';
  downtimeForm!: FormGroup;

  // Delete
  showDeleteConfirm = false;
  deletingEvent: DowntimeEvent | null = null;

  categories: DowntimeCategory[] = [
    'Mechanical Failure',
    'Electrical Issue',
    'Maintenance',
    'Material Shortage',
    'Quality Issue',
    'Operator Error',
    'Planned Maintenance',
    'Other'
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.downtimeForm = this.fb.group({
      workCentreId: ['', Validators.required],
      reason: ['', Validators.required],
      category: ['Mechanical Failure', Validators.required],
      startTime: ['', Validators.required],
      endTime: [''],
      notes: ['']
    });
  }

  loadData(): void {
    this.downtimeEvents = this.dataService.getDowntimeEvents().sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    this.workCentres = this.dataService.getWorkCentres();

    this.calculateKPIs();
    this.calculateCharts();
    this.applyFilters();
  }

  calculateKPIs(): void {
    this.totalEvents = this.downtimeEvents.length;
    this.totalDowntimeMinutes = this.downtimeEvents.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    this.activeDowntimeCount = this.downtimeEvents.filter(d => !d.endTime).length;
    const completedEvents = this.downtimeEvents.filter(d => !!d.durationMinutes);
    this.avgDurationMinutes = completedEvents.length > 0
      ? Math.round(this.totalDowntimeMinutes / completedEvents.length)
      : 0;
  }

  calculateCharts(): void {
    const totalMins = this.totalDowntimeMinutes || 1;

    // Work centre breakdown
    const wcMap = new Map<string, { minutes: number; count: number }>();
    for (const ev of this.downtimeEvents) {
      const existing = wcMap.get(ev.workCentreName) || { minutes: 0, count: 0 };
      existing.minutes += ev.durationMinutes || 0;
      existing.count += 1;
      wcMap.set(ev.workCentreName, existing);
    }

    this.wcDowntimes = Array.from(wcMap.entries()).map(([name, data]) => ({
      name,
      minutes: data.minutes,
      count: data.count,
      percentage: Math.round((data.minutes / totalMins) * 100)
    })).sort((a, b) => b.minutes - a.minutes);

    // Category breakdown
    const catMap = new Map<string, { minutes: number; count: number }>();
    for (const ev of this.downtimeEvents) {
      const existing = catMap.get(ev.category) || { minutes: 0, count: 0 };
      existing.minutes += ev.durationMinutes || 0;
      existing.count += 1;
      catMap.set(ev.category, existing);
    }

    this.categoryDowntimes = Array.from(catMap.entries()).map(([category, data]) => ({
      category,
      minutes: data.minutes,
      count: data.count,
      percentage: Math.round((data.minutes / totalMins) * 100)
    })).sort((a, b) => b.minutes - a.minutes);
  }

  applyFilters(): void {
    let result = [...this.downtimeEvents];
    const term = this.searchTerm.toLowerCase().trim();

    if (term) {
      result = result.filter(d =>
        d.workCentreName.toLowerCase().includes(term) ||
        d.reason.toLowerCase().includes(term) ||
        (d.notes && d.notes.toLowerCase().includes(term))
      );
    }

    if (this.categoryFilter) {
      result = result.filter(d => d.category === this.categoryFilter);
    }

    if (this.workCentreFilter) {
      result = result.filter(d => d.workCentreId === this.workCentreFilter);
    }

    this.filteredEvents = result;
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.editingId = '';

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const isoString = now.toISOString().slice(0, 16);

    this.downtimeForm.reset({
      workCentreId: this.workCentres.length > 0 ? this.workCentres[0].id : '',
      reason: '',
      category: 'Mechanical Failure',
      startTime: isoString,
      endTime: '',
      notes: ''
    });
    this.showModal = true;
  }

  openEditModal(ev: DowntimeEvent): void {
    this.isEditing = true;
    this.editingId = ev.id;
    this.downtimeForm.patchValue({
      workCentreId: ev.workCentreId,
      reason: ev.reason,
      category: ev.category,
      startTime: ev.startTime ? ev.startTime.slice(0, 16) : '',
      endTime: ev.endTime ? ev.endTime.slice(0, 16) : '',
      notes: ev.notes || ''
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveDowntime(): void {
    if (this.downtimeForm.invalid) {
      this.downtimeForm.markAllAsTouched();
      return;
    }

    const val = this.downtimeForm.value;
    const wc = this.workCentres.find(w => w.id === val.workCentreId);
    if (!wc) return;

    let duration: number | undefined;
    if (val.startTime && val.endTime) {
      const diffMs = new Date(val.endTime).getTime() - new Date(val.startTime).getTime();
      if (diffMs < 0) {
        this.notificationService.error('End time cannot be earlier than start time!');
        return;
      }
      duration = Math.round(diffMs / (1000 * 60));
    }

    const event: DowntimeEvent = {
      id: this.isEditing ? this.editingId : this.dataService.generateId('DT'),
      workCentreId: wc.id,
      workCentreName: wc.name,
      reason: val.reason,
      category: val.category,
      startTime: val.startTime,
      endTime: val.endTime || undefined,
      durationMinutes: duration,
      notes: val.notes || '',
      createdAt: this.isEditing ? (this.dataService.getDowntimeEvent(this.editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    this.dataService.saveDowntimeEvent(event);
    this.notificationService.success(this.isEditing ? 'Downtime event updated.' : 'Downtime event logged.');
    this.closeModal();
    this.loadData();
  }

  endDowntimeNow(ev: DowntimeEvent): void {
    const now = new Date();
    const diffMs = now.getTime() - new Date(ev.startTime).getTime();
    ev.endTime = now.toISOString();
    ev.durationMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

    this.dataService.saveDowntimeEvent(ev);
    this.notificationService.success(`Downtime ended for ${ev.workCentreName}. Duration: ${ev.durationMinutes} mins.`);
    this.loadData();
  }

  confirmDelete(ev: DowntimeEvent): void {
    this.deletingEvent = ev;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingEvent = null;
  }

  deleteEvent(): void {
    if (!this.deletingEvent) return;
    this.dataService.deleteDowntimeEvent(this.deletingEvent.id);
    this.notificationService.success('Downtime event deleted.');
    this.cancelDelete();
    this.loadData();
  }

  isFieldInvalid(field: string): boolean {
    const c = this.downtimeForm.get(field);
    return !!(c && c.invalid && c.touched);
  }
}
