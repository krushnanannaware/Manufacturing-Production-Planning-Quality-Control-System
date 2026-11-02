import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import {
  ProductionOrder, WorkCentre, QualityInspection, Defect, DashboardStats
} from '../../core/models/interfaces';

export interface WorkCentreYield {
  id: string;
  name: string;
  totalProduced: number;
  totalAccepted: number;
  totalRejected: number;
  yieldPercent: number;
  rejectionPercent: number;
  orderCount: number;
}

@Component({
  selector: 'app-yield-analytics',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './yield-analytics.component.html',
  styleUrl: './yield-analytics.component.css'
})
export class YieldAnalyticsComponent implements OnInit {
  private dataService = inject(DataService);

  orders: ProductionOrder[] = [];
  workCentres: WorkCentre[] = [];
  inspections: QualityInspection[] = [];
  defects: Defect[] = [];
  stats!: DashboardStats;

  // Aggregate Metrics
  totalPlanned = 0;
  totalProduced = 0;
  totalAccepted = 0;
  totalRejected = 0;
  overallYieldPercent = 0;
  overallRejectionPercent = 0;

  // Performance Table
  orderPerformance: {
    order: ProductionOrder;
    yieldPercent: number;
    completionPercent: number;
    rejectionPercent: number;
    isLowYield: boolean;
  }[] = [];

  // Work Centre Analytics
  workCentreYields: WorkCentreYield[] = [];

  // Chart: Planned vs Actual
  comparisonData: { label: string; planned: number; actual: number; plannedHeight: number; actualHeight: number }[] = [];

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.orders = this.dataService.getProductionOrders();
    this.workCentres = this.dataService.getWorkCentres();
    this.inspections = this.dataService.getInspections();
    this.defects = this.dataService.getDefects();
    this.stats = this.dataService.getDashboardStats();

    this.calculateAggregates();
    this.buildOrderPerformance();
    this.buildWorkCentreYields();
    this.buildComparisonChart();
  }

  calculateAggregates(): void {
    this.totalPlanned = this.orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    this.totalProduced = this.orders.reduce((sum, o) => sum + (o.producedQuantity || 0), 0);
    this.totalAccepted = this.orders.reduce((sum, o) => sum + (o.acceptedQuantity || 0), 0);
    this.totalRejected = this.orders.reduce((sum, o) => sum + (o.rejectedQuantity || 0), 0);

    this.overallYieldPercent = this.totalProduced > 0
      ? Math.round((this.totalAccepted / this.totalProduced) * 1000) / 10
      : 0;

    this.overallRejectionPercent = this.totalProduced > 0
      ? Math.round((this.totalRejected / this.totalProduced) * 1000) / 10
      : 0;
  }

  buildOrderPerformance(): void {
    this.orderPerformance = this.orders
      .filter(o => o.producedQuantity > 0 || o.status === 'Completed' || o.status === 'In Progress')
      .map(o => {
        const yieldPercent = o.producedQuantity > 0
          ? Math.round((o.acceptedQuantity / o.producedQuantity) * 1000) / 10
          : 0;
        const completionPercent = o.quantity > 0
          ? Math.min(100, Math.round((o.producedQuantity / o.quantity) * 100))
          : 0;
        const rejectionPercent = o.producedQuantity > 0
          ? Math.round((o.rejectedQuantity / o.producedQuantity) * 1000) / 10
          : 0;

        return {
          order: o,
          yieldPercent,
          completionPercent,
          rejectionPercent,
          isLowYield: yieldPercent > 0 && yieldPercent < 90
        };
      })
      .sort((a, b) => a.yieldPercent - b.yieldPercent);
  }

  buildWorkCentreYields(): void {
    this.workCentreYields = this.workCentres.map(wc => {
      const wcOrders = this.orders.filter(o => o.workCentreId === wc.id);
      const produced = wcOrders.reduce((s, o) => s + (o.producedQuantity || 0), 0);
      const accepted = wcOrders.reduce((s, o) => s + (o.acceptedQuantity || 0), 0);
      const rejected = wcOrders.reduce((s, o) => s + (o.rejectedQuantity || 0), 0);

      const yPercent = produced > 0 ? Math.round((accepted / produced) * 1000) / 10 : 0;
      const rPercent = produced > 0 ? Math.round((rejected / produced) * 1000) / 10 : 0;

      return {
        id: wc.id,
        name: wc.name,
        totalProduced: produced,
        totalAccepted: accepted,
        totalRejected: rejected,
        yieldPercent: yPercent,
        rejectionPercent: rPercent,
        orderCount: wcOrders.length
      };
    }).filter(w => w.orderCount > 0);
  }

  buildComparisonChart(): void {
    const active = this.orders.slice(0, 6);
    const maxVal = Math.max(...active.map(o => Math.max(o.quantity, o.producedQuantity)), 100);

    this.comparisonData = active.map(o => ({
      label: o.id,
      planned: o.quantity,
      actual: o.producedQuantity,
      plannedHeight: Math.max(6, Math.round((o.quantity / maxVal) * 160)),
      actualHeight: Math.max(6, Math.round((o.producedQuantity / maxVal) * 160))
    }));
  }

  getYieldColor(y: number): string {
    if (y >= 95) return 'green';
    if (y >= 85) return 'blue';
    if (y >= 70) return 'orange';
    return 'red';
  }
}
