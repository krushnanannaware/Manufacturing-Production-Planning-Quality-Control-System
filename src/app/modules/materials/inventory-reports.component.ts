import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, LowerCasePipe } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { RawMaterial, InventoryTransaction } from '../../core/models/interfaces';

export type ReportType =
  | 'stock-receipt'
  | 'stock-consumption'
  | 'material-reservations'
  | 'stock-adjustments'
  | 'current-stock'
  | 'all-transactions';

export interface ReportSummary {
  totalReceipt: number;
  totalConsumption: number;
  totalReservation: number;
  totalAdjustment: number;
  netChange: number;
}

@Component({
  selector: 'app-inventory-reports',
  standalone: true,
  imports: [FormsModule, DecimalPipe, LowerCasePipe],
  templateUrl: './inventory-reports.component.html',
  styleUrl: './inventory-reports.component.css'
})
export class InventoryReportsComponent implements OnInit {
  private dataService = inject(DataService);
  private notif = inject(NotificationService);

  // Raw data
  allMaterials: RawMaterial[] = [];
  allTransactions: InventoryTransaction[] = [];

  // Active report
  activeReport: ReportType = 'stock-receipt';

  // Filters
  filterDateFrom = '';
  filterDateTo = '';
  filterMaterial = '';
  filterType = '';

  // Computed report rows
  reportRows: InventoryTransaction[] = [];
  stockRows: RawMaterial[] = [];

  // Summary
  summary: ReportSummary = {
    totalReceipt: 0,
    totalConsumption: 0,
    totalReservation: 0,
    totalAdjustment: 0,
    netChange: 0
  };

  // Overall stock summary
  totalStockValue = 0;
  lowStockCount = 0;
  totalAvailableStock = 0;

  readonly reportDefinitions: { type: ReportType; label: string; icon: string; desc: string }[] = [
    { type: 'stock-receipt',        label: 'Stock Receipt',            icon: '📥', desc: 'All incoming stock receipts' },
    { type: 'stock-consumption',    label: 'Stock Consumption',        icon: '📤', desc: 'All material consumption records' },
    { type: 'material-reservations',label: 'Material Reservations',   icon: '🔒', desc: 'All reservation transactions' },
    { type: 'stock-adjustments',    label: 'Stock Adjustments',       icon: '⚖️', desc: 'All manual stock adjustments' },
    { type: 'current-stock',        label: 'Current Stock Levels',    icon: '📦', desc: 'Live snapshot of all material stock' },
    { type: 'all-transactions',     label: 'Transaction History',     icon: '📋', desc: 'Complete inventory transaction log' }
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.allMaterials = this.dataService.getRawMaterials();
    this.allTransactions = this.dataService.getInventoryTransactions()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    this.generateReport();
  }

  selectReport(type: ReportType): void {
    this.activeReport = type;
    this.filterType = '';
    this.generateReport();
  }

  generateReport(): void {
    if (this.activeReport === 'current-stock') {
      this.buildStockReport();
    } else {
      this.buildTransactionReport();
    }
    this.buildSummary();
  }

  private buildTransactionReport(): void {
    let txns = [...this.allTransactions];

    // Type filter from active report
    const typeMap: Partial<Record<ReportType, string>> = {
      'stock-receipt':         'Receipt',
      'stock-consumption':     'Consumption',
      'material-reservations': 'Reservation',
      'stock-adjustments':     'Adjustment'
    };
    const impliedType = typeMap[this.activeReport];
    if (impliedType) {
      txns = txns.filter(t => t.transactionType === impliedType);
    }

    // Manual type filter (only active on 'all-transactions')
    if (!impliedType && this.filterType) {
      txns = txns.filter(t => t.transactionType === this.filterType);
    }

    // Material filter
    if (this.filterMaterial) {
      txns = txns.filter(t => t.materialId === this.filterMaterial);
    }

    // Date range filter
    if (this.filterDateFrom) {
      txns = txns.filter(t => t.date >= this.filterDateFrom);
    }
    if (this.filterDateTo) {
      txns = txns.filter(t => t.date <= this.filterDateTo);
    }

    this.reportRows = txns;
  }

  private buildStockReport(): void {
    let mats = [...this.allMaterials];
    if (this.filterMaterial) {
      mats = mats.filter(m => m.id === this.filterMaterial);
    }
    this.stockRows = mats;
    this.totalStockValue = mats.reduce((s, m) => s + m.availableStock * m.unitCost, 0);
    this.totalAvailableStock = mats.reduce((s, m) => s + m.availableStock, 0);
    this.lowStockCount = mats.filter(m => m.availableStock <= m.minimumStockLevel).length;
  }

  private buildSummary(): void {
    // Always use all transactions filtered by material/date only (not type) for summary
    let base = [...this.allTransactions];
    if (this.filterMaterial) base = base.filter(t => t.materialId === this.filterMaterial);
    if (this.filterDateFrom) base = base.filter(t => t.date >= this.filterDateFrom);
    if (this.filterDateTo)   base = base.filter(t => t.date <= this.filterDateTo);

    const receipt   = base.filter(t => t.transactionType === 'Receipt').reduce((s, t) => s + Math.abs(t.quantity), 0);
    const consume   = base.filter(t => t.transactionType === 'Consumption').reduce((s, t) => s + Math.abs(t.quantity), 0);
    const reserve   = base.filter(t => t.transactionType === 'Reservation').reduce((s, t) => s + Math.abs(t.quantity), 0);
    const adjust    = base.filter(t => t.transactionType === 'Adjustment').reduce((s, t) => s + t.quantity, 0);

    this.summary = {
      totalReceipt: receipt,
      totalConsumption: consume,
      totalReservation: reserve,
      totalAdjustment: adjust,
      netChange: receipt - consume + adjust
    };
  }

  clearFilters(): void {
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterMaterial = '';
    this.filterType = '';
    this.generateReport();
  }

  // ── PDF / Print ────────────────────────────────────────────────

  downloadCurrentReport(): void {
    const def = this.reportDefinitions.find(r => r.type === this.activeReport)!;
    this.printReport(def.label, false);
  }

  downloadAllReports(): void {
    this.printReport('Consolidated Inventory Report', true);
  }

  private printReport(title: string, allReports: boolean): void {
    const html = allReports ? this.buildAllReportsHtml() : this.buildSingleReportHtml(title);
    const win = window.open('', '_blank');
    if (!win) {
      this.notif.error('Pop-up blocked. Please allow pop-ups for this site.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 600);
    this.notif.success(`"${title}" ready — use "Save as PDF" in the print dialog.`);
  }

  private getStyles(): string {
    return `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
        .report-wrapper { padding: 28px 32px; max-width: 1100px; margin: auto; }
        .report-header { border-bottom: 3px solid #1e40af; padding-bottom: 14px; margin-bottom: 20px; }
        .report-header h1 { font-size: 20px; color: #1e40af; font-weight: 700; margin-bottom: 2px; }
        .report-header .subtitle { font-size: 12px; color: #475569; }
        .report-header .meta { margin-top: 8px; font-size: 11px; color: #64748b; display: flex; gap: 24px; }
        h2 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 20px 0 8px; border-left: 4px solid #3b82f6; padding-left: 8px; }
        h3 { font-size: 12px; font-weight: 600; color: #475569; margin: 6px 0 10px; }
        .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 18px; }
        .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; text-align: center; }
        .summary-card .val { font-size: 16px; font-weight: 700; color: #1e40af; }
        .summary-card .lbl { font-size: 10px; color: #64748b; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        thead { background: #1e40af; color: #fff; }
        thead th { padding: 7px 8px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        tbody td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; vertical-align: top; }
        .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 9px; font-weight: 600; }
        .badge-receipt    { background: #dcfce7; color: #166534; }
        .badge-consumption { background: #fee2e2; color: #991b1b; }
        .badge-reservation { background: #dbeafe; color: #1e40af; }
        .badge-adjustment { background: #fef9c3; color: #854d0e; }
        .badge-low  { background: #fee2e2; color: #991b1b; }
        .badge-ok   { background: #dcfce7; color: #166534; }
        .qty-pos { color: #16a34a; font-weight: 700; }
        .qty-neg { color: #dc2626; font-weight: 700; }
        .report-footer { border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 20px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
        .page-break { page-break-before: always; padding-top: 28px; }
        .filters-row { font-size: 10px; color: #64748b; margin-bottom: 10px; background: #f1f5f9; padding: 6px 10px; border-radius: 4px; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none; }
        }
      </style>`;
  }

  private getHeader(title: string): string {
    const now = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
    const filters = [
      this.filterDateFrom ? `From: ${this.filterDateFrom}` : '',
      this.filterDateTo   ? `To: ${this.filterDateTo}` : '',
      this.filterMaterial ? `Material: ${this.allMaterials.find(m => m.id === this.filterMaterial)?.name || this.filterMaterial}` : ''
    ].filter(Boolean).join(' | ');

    return `
      <div class="report-header">
        <h1>Manufacturing Production Planning & Quality Control System</h1>
        <div class="subtitle">Group 19 — Inventory ${title}</div>
        <div class="meta">
          <span>Generated: ${now}</span>
          <span>System: MFG Pro ERP</span>
          ${filters ? `<span>Filters: ${filters}</span>` : ''}
        </div>
      </div>`;
  }

  private getSummaryBlock(): string {
    const s = this.summary;
    return `
      <h2>Transaction Summary</h2>
      <div class="summary-grid">
        <div class="summary-card"><div class="val">${s.totalReceipt.toFixed(2)}</div><div class="lbl">Total Received</div></div>
        <div class="summary-card"><div class="val">${s.totalConsumption.toFixed(2)}</div><div class="lbl">Total Consumed</div></div>
        <div class="summary-card"><div class="val">${s.totalReservation.toFixed(2)}</div><div class="lbl">Total Reserved</div></div>
        <div class="summary-card"><div class="val">${s.totalAdjustment >= 0 ? '+' : ''}${s.totalAdjustment.toFixed(2)}</div><div class="lbl">Net Adjustments</div></div>
        <div class="summary-card"><div class="val" style="color:${s.netChange >= 0 ? '#16a34a' : '#dc2626'}">${s.netChange >= 0 ? '+' : ''}${s.netChange.toFixed(2)}</div><div class="lbl">Net Stock Change</div></div>
      </div>`;
  }

  private getTransactionTable(rows: InventoryTransaction[], heading?: string): string {
    if (rows.length === 0) return `<p style="color:#94a3b8;font-style:italic;margin:12px 0">No records found for the selected filters.</p>`;
    const badgeMap: Record<string, string> = {
      'Receipt': 'receipt', 'Consumption': 'consumption',
      'Reservation': 'reservation', 'Adjustment': 'adjustment'
    };
    const rowsHtml = rows.map(t => `
      <tr>
        <td><strong>${t.id}</strong></td>
        <td>${t.date}</td>
        <td><span class="badge badge-${badgeMap[t.transactionType] || ''}">${t.transactionType}</span></td>
        <td>${t.materialId}</td>
        <td>${t.materialName}</td>
        <td class="${t.quantity > 0 ? 'qty-pos' : 'qty-neg'}">${t.quantity > 0 ? '+' : ''}${t.quantity}</td>
        <td>${t.productionOrderId || '—'}</td>
        <td>${t.notes || '—'}</td>
      </tr>`).join('');

    return `
      ${heading ? `<h2>${heading}</h2>` : ''}
      <h3>${rows.length} record(s)</h3>
      <table>
        <thead>
          <tr>
            <th>Txn ID</th><th>Date</th><th>Type</th><th>Material ID</th>
            <th>Material Name</th><th>Quantity</th><th>Prod. Order</th><th>Notes</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
  }

  private getStockTable(rows: RawMaterial[], heading?: string): string {
    const rowsHtml = rows.map(m => {
      const net = m.availableStock - m.reservedStock;
      const isLow = m.availableStock <= m.minimumStockLevel;
      return `
        <tr>
          <td><strong>${m.id}</strong></td>
          <td>${m.name}</td>
          <td>${m.category}</td>
          <td>${m.availableStock} ${m.unit}</td>
          <td>${m.reservedStock} ${m.unit}</td>
          <td class="${net < 0 ? 'qty-neg' : 'qty-pos'}">${net} ${m.unit}</td>
          <td>${m.minimumStockLevel} ${m.unit}</td>
          <td>₹${m.unitCost.toFixed(2)}</td>
          <td>₹${(m.availableStock * m.unitCost).toFixed(2)}</td>
          <td><span class="badge ${isLow ? 'badge-low' : 'badge-ok'}">${isLow ? 'Low Stock' : 'Healthy'}</span></td>
        </tr>`;
    }).join('');

    const totalVal = rows.reduce((s, m) => s + m.availableStock * m.unitCost, 0);
    return `
      ${heading ? `<h2>${heading}</h2>` : ''}
      <h3>${rows.length} material(s) · Total Value: ₹${totalVal.toFixed(2)}</h3>
      <table>
        <thead>
          <tr>
            <th>Material ID</th><th>Name</th><th>Category</th><th>Available</th>
            <th>Reserved</th><th>Net Available</th><th>Min Level</th><th>Unit Cost</th><th>Stock Value</th><th>Status</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
  }

  private getFooter(): string {
    return `
      <div class="report-footer">
        <span>Manufacturing Production Planning & Quality Control System — Group 19</span>
        <span>Developed by One Commit</span>
      </div>`;
  }

  private buildSingleReportHtml(title: string): string {
    let body = '';
    if (this.activeReport === 'current-stock') {
      body = this.getStockTable(this.stockRows);
    } else {
      body = this.getSummaryBlock() + this.getTransactionTable(this.reportRows);
    }

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title>${this.getStyles()}</head>
      <body><div class="report-wrapper">
        ${this.getHeader(title)}
        ${body}
        ${this.getFooter()}
      </div></body></html>`;
  }

  private buildAllReportsHtml(): string {
    const allTxns = this.allTransactions;
    const byType = (type: string) => allTxns.filter(t =>
      t.transactionType === type &&
      (!this.filterMaterial || t.materialId === this.filterMaterial) &&
      (!this.filterDateFrom || t.date >= this.filterDateFrom) &&
      (!this.filterDateTo   || t.date <= this.filterDateTo)
    );

    const receipts    = byType('Receipt');
    const consumptions = byType('Consumption');
    const reservations = byType('Reservation');
    const adjustments  = byType('Adjustment');

    const stockMats = this.filterMaterial
      ? this.allMaterials.filter(m => m.id === this.filterMaterial)
      : this.allMaterials;

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Consolidated Inventory Report</title>${this.getStyles()}</head>
      <body><div class="report-wrapper">
        ${this.getHeader('Consolidated Inventory Report')}
        ${this.getSummaryBlock()}

        ${this.getTransactionTable(receipts,     '📥 Stock Receipts')}
        <div class="page-break">
        ${this.getTransactionTable(consumptions, '📤 Stock Consumptions')}
        </div>
        <div class="page-break">
        ${this.getTransactionTable(reservations, '🔒 Material Reservations')}
        </div>
        <div class="page-break">
        ${this.getTransactionTable(adjustments,  '⚖️ Stock Adjustments')}
        </div>
        <div class="page-break">
        ${this.getStockTable(stockMats,          '📦 Current Stock Levels')}
        </div>

        ${this.getFooter()}
      </div></body></html>`;
  }

  // ── Helpers ─────────────────────────────────────────────────────

  getActiveReportDef() {
    return this.reportDefinitions.find(r => r.type === this.activeReport)!;
  }

  txnBadgeClass(type: string): string {
    const m: Record<string, string> = {
      'Receipt':     'badge-receipt',
      'Consumption': 'badge-consumption',
      'Reservation': 'badge-reservation',
      'Adjustment':  'badge-adjustment'
    };
    return 'badge ' + (m[type] || '');
  }

  isCurrentStock(): boolean {
    return this.activeReport === 'current-stock';
  }

  isAllTransactions(): boolean {
    return this.activeReport === 'all-transactions';
  }

  trackById(_: number, item: { id: string }): string { return item.id; }
}

