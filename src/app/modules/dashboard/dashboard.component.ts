import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import {
  DashboardStats, ProductionOrder, RawMaterial, QualityInspection, Defect, DowntimeEvent
} from '../../core/models/interfaces';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private dataService = inject(DataService);

  stats!: DashboardStats;
  recentOrders: ProductionOrder[] = [];
  lowStockItems: RawMaterial[] = [];
  recentInspections: QualityInspection[] = [];
  recentDefects: Defect[] = [];
  activeDowntimes: DowntimeEvent[] = [];

  // Order status bars calculation
  orderStatusCounts: { label: string; count: number; colorClass: string; percentage: number }[] = [];

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.stats = this.dataService.getDashboardStats();

    const orders = this.dataService.getProductionOrders();
    this.recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt || b.plannedStartDate).getTime() - new Date(a.createdAt || a.plannedStartDate).getTime())
      .slice(0, 5);

    const materials = this.dataService.getRawMaterials();
    this.lowStockItems = materials.filter(m => m.availableStock <= m.minimumStockLevel);

    const inspections = this.dataService.getInspections();
    this.recentInspections = [...inspections]
      .sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime())
      .slice(0, 5);

    const defects = this.dataService.getDefects();
    this.recentDefects = [...defects]
      .sort((a, b) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime())
      .slice(0, 5);

    const downtimes = this.dataService.getDowntimeEvents();
    this.activeDowntimes = downtimes.filter(d => !d.endTime);

    const total = this.stats.totalOrders || 1;
    this.orderStatusCounts = [
      { label: 'Planned', count: this.stats.plannedOrders, colorClass: 'blue', percentage: Math.round((this.stats.plannedOrders / total) * 100) },
      { label: 'In Progress', count: this.stats.inProgressOrders, colorClass: 'orange', percentage: Math.round((this.stats.inProgressOrders / total) * 100) },
      { label: 'Completed', count: this.stats.completedOrders, colorClass: 'green', percentage: Math.round((this.stats.completedOrders / total) * 100) },
      { label: 'On Hold', count: this.stats.onHoldOrders, colorClass: 'yellow', percentage: Math.round((this.stats.onHoldOrders / total) * 100) },
      { label: 'Cancelled', count: this.stats.cancelledOrders, colorClass: 'red', percentage: Math.round((this.stats.cancelledOrders / total) * 100) }
    ];
  }

  getProgress(order: ProductionOrder): number {
    if (order.quantity === 0) return 0;
    return Math.round((order.producedQuantity / order.quantity) * 100);
  }

  getOrderBadge(status: string): string {
    const map: Record<string, string> = {
      'Planned': 'badge-planned',
      'In Progress': 'badge-in-progress',
      'Completed': 'badge-completed',
      'On Hold': 'badge-on-hold',
      'Cancelled': 'badge-cancelled'
    };
    return 'badge ' + (map[status] || 'badge-planned');
  }

  getInspectionBadge(res: string): string {
    switch (res) {
      case 'Pass': return 'badge badge-pass';
      case 'Fail': return 'badge badge-fail';
      default: return 'badge badge-partial';
    }
  }

  getSeverityBadge(sev: string): string {
    return 'badge badge-' + sev.toLowerCase();
  }
}
