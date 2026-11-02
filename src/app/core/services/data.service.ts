import { Injectable } from '@angular/core';
import {
  ProductionOrder, WorkCentre, ProductionSchedule,
  RawMaterial, BillOfMaterials, InventoryTransaction,
  QualityInspection, Defect, CorrectiveAction,
  DowntimeEvent, FinishedProduct, DashboardStats,
  ProductionStatus, Priority
} from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class DataService {

  private readonly STORAGE_KEYS = {
    productionOrders: 'mfg_production_orders',
    workCentres: 'mfg_work_centres',
    schedules: 'mfg_schedules',
    rawMaterials: 'mfg_raw_materials',
    boms: 'mfg_boms',
    inventoryTransactions: 'mfg_inventory_transactions',
    inspections: 'mfg_inspections',
    defects: 'mfg_defects',
    correctiveActions: 'mfg_corrective_actions',
    downtimeEvents: 'mfg_downtime_events',
    finishedProducts: 'mfg_finished_products',
    initialized: 'mfg_data_initialized'
  };

  constructor() {
    this.initializeDemoData();
  }

  // ============================================================
  // Generic localStorage helpers
  // ============================================================

  private getItems<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private setItems<T>(key: string, items: T[]): void {
    localStorage.setItem(key, JSON.stringify(items));
  }

  generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  // ============================================================
  // Finished Products (shared reference data)
  // ============================================================

  getFinishedProducts(): FinishedProduct[] {
    return this.getItems<FinishedProduct>(this.STORAGE_KEYS.finishedProducts);
  }

  // ============================================================
  // Production Orders
  // ============================================================

  getProductionOrders(): ProductionOrder[] {
    return this.getItems<ProductionOrder>(this.STORAGE_KEYS.productionOrders);
  }

  getProductionOrder(id: string): ProductionOrder | undefined {
    return this.getProductionOrders().find(o => o.id === id);
  }

  saveProductionOrder(order: ProductionOrder): void {
    const orders = this.getProductionOrders();
    const index = orders.findIndex(o => o.id === order.id);
    if (index >= 0) {
      orders[index] = { ...order, updatedAt: new Date().toISOString() };
    } else {
      orders.push({ ...order, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.setItems(this.STORAGE_KEYS.productionOrders, orders);
  }

  deleteProductionOrder(id: string): { success: boolean; message: string } {
    // Check dependencies
    const inspections = this.getInspections().filter(i => i.productionOrderId === id);
    const schedules = this.getSchedules().filter(s => s.productionOrderId === id);
    if (inspections.length > 0) {
      return { success: false, message: `Cannot delete: ${inspections.length} inspection(s) linked to this order.` };
    }
    const orders = this.getProductionOrders().filter(o => o.id !== id);
    this.setItems(this.STORAGE_KEYS.productionOrders, orders);
    // Also clean up schedules
    const remaining = this.getSchedules().filter(s => s.productionOrderId !== id);
    this.setItems(this.STORAGE_KEYS.schedules, remaining);
    return { success: true, message: 'Production order deleted successfully.' };
  }

  // ============================================================
  // Work Centres
  // ============================================================

  getWorkCentres(): WorkCentre[] {
    return this.getItems<WorkCentre>(this.STORAGE_KEYS.workCentres);
  }

  getWorkCentre(id: string): WorkCentre | undefined {
    return this.getWorkCentres().find(w => w.id === id);
  }

  saveWorkCentre(wc: WorkCentre): void {
    const items = this.getWorkCentres();
    const index = items.findIndex(w => w.id === wc.id);
    if (index >= 0) {
      items[index] = { ...wc, updatedAt: new Date().toISOString() };
    } else {
      items.push({ ...wc, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.setItems(this.STORAGE_KEYS.workCentres, items);
  }

  deleteWorkCentre(id: string): { success: boolean; message: string } {
    const orders = this.getProductionOrders().filter(o => o.workCentreId === id);
    if (orders.length > 0) {
      return { success: false, message: `Cannot delete: ${orders.length} production order(s) assigned to this work centre.` };
    }
    const items = this.getWorkCentres().filter(w => w.id !== id);
    this.setItems(this.STORAGE_KEYS.workCentres, items);
    return { success: true, message: 'Work centre deleted successfully.' };
  }

  // ============================================================
  // Production Schedules
  // ============================================================

  getSchedules(): ProductionSchedule[] {
    return this.getItems<ProductionSchedule>(this.STORAGE_KEYS.schedules);
  }

  getSchedule(id: string): ProductionSchedule | undefined {
    return this.getSchedules().find(s => s.id === id);
  }

  saveSchedule(schedule: ProductionSchedule): void {
    const items = this.getSchedules();
    const index = items.findIndex(s => s.id === schedule.id);
    if (index >= 0) {
      items[index] = schedule;
    } else {
      items.push({ ...schedule, createdAt: new Date().toISOString() });
    }
    this.setItems(this.STORAGE_KEYS.schedules, items);
  }

  deleteSchedule(id: string): void {
    const items = this.getSchedules().filter(s => s.id !== id);
    this.setItems(this.STORAGE_KEYS.schedules, items);
  }

  checkScheduleConflicts(workCentreId: string, start: string, end: string, excludeId?: string): ProductionSchedule[] {
    return this.getSchedules().filter(s => {
      if (s.id === excludeId) return false;
      if (s.workCentreId !== workCentreId) return false;
      if (s.status === 'Cancelled' || s.status === 'Completed') return false;
      const sStart = new Date(s.scheduledStartDate).getTime();
      const sEnd = new Date(s.scheduledEndDate).getTime();
      const nStart = new Date(start).getTime();
      const nEnd = new Date(end).getTime();
      return nStart < sEnd && nEnd > sStart;
    });
  }

  // ============================================================
  // Raw Materials
  // ============================================================

  getRawMaterials(): RawMaterial[] {
    return this.getItems<RawMaterial>(this.STORAGE_KEYS.rawMaterials);
  }

  getRawMaterial(id: string): RawMaterial | undefined {
    return this.getRawMaterials().find(m => m.id === id);
  }

  saveRawMaterial(material: RawMaterial): void {
    const items = this.getRawMaterials();
    const index = items.findIndex(m => m.id === material.id);
    if (index >= 0) {
      items[index] = { ...material, updatedAt: new Date().toISOString() };
    } else {
      items.push({ ...material, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.setItems(this.STORAGE_KEYS.rawMaterials, items);
  }

  deleteRawMaterial(id: string): { success: boolean; message: string } {
    const boms = this.getBoms();
    const usedInBom = boms.some(b => b.materials.some(m => m.materialId === id));
    if (usedInBom) {
      return { success: false, message: 'Cannot delete: material is used in one or more Bill of Materials.' };
    }
    const items = this.getRawMaterials().filter(m => m.id !== id);
    this.setItems(this.STORAGE_KEYS.rawMaterials, items);
    return { success: true, message: 'Raw material deleted successfully.' };
  }

  updateMaterialStock(materialId: string, quantityChange: number): void {
    const materials = this.getRawMaterials();
    const index = materials.findIndex(m => m.id === materialId);
    if (index >= 0) {
      materials[index].availableStock += quantityChange;
      if (materials[index].availableStock < 0) materials[index].availableStock = 0;
      materials[index].updatedAt = new Date().toISOString();
      this.setItems(this.STORAGE_KEYS.rawMaterials, materials);
    }
  }

  updateMaterialReservation(materialId: string, reserveChange: number): void {
    const materials = this.getRawMaterials();
    const index = materials.findIndex(m => m.id === materialId);
    if (index >= 0) {
      materials[index].reservedStock += reserveChange;
      if (materials[index].reservedStock < 0) materials[index].reservedStock = 0;
      materials[index].updatedAt = new Date().toISOString();
      this.setItems(this.STORAGE_KEYS.rawMaterials, materials);
    }
  }

  // ============================================================
  // Bill of Materials
  // ============================================================

  getBoms(): BillOfMaterials[] {
    return this.getItems<BillOfMaterials>(this.STORAGE_KEYS.boms);
  }

  getBom(id: string): BillOfMaterials | undefined {
    return this.getBoms().find(b => b.id === id);
  }

  getBomByProduct(productId: string): BillOfMaterials | undefined {
    return this.getBoms().find(b => b.productId === productId);
  }

  saveBom(bom: BillOfMaterials): void {
    const items = this.getBoms();
    const index = items.findIndex(b => b.id === bom.id);
    if (index >= 0) {
      items[index] = { ...bom, updatedAt: new Date().toISOString() };
    } else {
      items.push({ ...bom, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.setItems(this.STORAGE_KEYS.boms, items);
  }

  deleteBom(id: string): { success: boolean; message: string } {
    const bom = this.getBom(id);
    if (bom) {
      const orders = this.getProductionOrders().filter(o => o.productId === bom.productId);
      const activeOrders = orders.filter(o => o.status === 'In Progress' || o.status === 'Planned');
      if (activeOrders.length > 0) {
        return { success: false, message: `Cannot delete: ${activeOrders.length} active production order(s) use this BOM.` };
      }
    }
    const items = this.getBoms().filter(b => b.id !== id);
    this.setItems(this.STORAGE_KEYS.boms, items);
    return { success: true, message: 'Bill of Materials deleted successfully.' };
  }

  calculateMaterialRequirements(productId: string, quantity: number): { materialId: string; materialName: string; required: number; available: number; reserved: number; shortage: number; unit: string }[] {
    const bom = this.getBomByProduct(productId);
    if (!bom) return [];
    return bom.materials.map(m => {
      const material = this.getRawMaterial(m.materialId);
      const required = m.quantityRequired * quantity;
      const available = material ? material.availableStock : 0;
      const reserved = material ? material.reservedStock : 0;
      const effectiveAvailable = available - reserved;
      const shortage = Math.max(0, required - effectiveAvailable);
      return {
        materialId: m.materialId,
        materialName: m.materialName,
        required,
        available,
        reserved,
        shortage,
        unit: m.unit
      };
    });
  }

  consumeMaterialsForOrder(orderId: string): { success: boolean; message: string } {
    const order = this.getProductionOrder(orderId);
    if (!order) return { success: false, message: 'Production order not found.' };
    if (order.materialsConsumed) {
      return { success: false, message: `Materials have already been consumed for Order ${orderId}.` };
    }
    const requirements = this.calculateMaterialRequirements(order.productId, order.quantity);
    if (requirements.length === 0) {
      return { success: false, message: 'No BOM found for this product.' };
    }
    const shortages = requirements.filter(r => r.available < r.required);
    if (shortages.length > 0) {
      const details = shortages.map(s => `${s.materialName} (Need: ${s.required}, Avail: ${s.available})`).join(', ');
      return { success: false, message: `Cannot consume: Insufficient stock for ${details}.` };
    }

    const today = new Date().toISOString().split('T')[0];
    for (const req of requirements) {
      this.updateMaterialStock(req.materialId, -req.required);
      if (req.reserved > 0) {
        this.updateMaterialReservation(req.materialId, -Math.min(req.reserved, req.required));
      }
      this.addInventoryTransaction({
        id: this.generateId('IT'),
        materialId: req.materialId,
        materialName: req.materialName,
        transactionType: 'Consumption',
        quantity: -req.required,
        productionOrderId: order.id,
        notes: `Material consumption for ${order.id} (${order.productName})`,
        date: today,
        createdAt: new Date().toISOString()
      });
    }

    order.materialsConsumed = true;
    if (order.status === 'Planned') {
      order.status = 'In Progress';
      order.actualStartDate = today;
    }
    this.saveProductionOrder(order);
    return { success: true, message: `Successfully consumed raw materials for Order ${order.id}.` };
  }

  reserveMaterialsForOrder(orderId: string): { success: boolean; message: string } {
    const order = this.getProductionOrder(orderId);
    if (!order) return { success: false, message: 'Production order not found.' };
    const requirements = this.calculateMaterialRequirements(order.productId, order.quantity);
    if (requirements.length === 0) {
      return { success: false, message: 'No BOM found for this product.' };
    }
    const today = new Date().toISOString().split('T')[0];
    for (const req of requirements) {
      const unreserved = Math.max(0, req.available - req.reserved);
      const toReserve = Math.min(unreserved, req.required);
      if (toReserve > 0) {
        this.updateMaterialReservation(req.materialId, toReserve);
        this.addInventoryTransaction({
          id: this.generateId('IT'),
          materialId: req.materialId,
          materialName: req.materialName,
          transactionType: 'Reservation',
          quantity: toReserve,
          productionOrderId: order.id,
          notes: `Material reserved for ${order.id}`,
          date: today,
          createdAt: new Date().toISOString()
        });
      }
    }
    return { success: true, message: `Raw materials reserved for Order ${order.id}.` };
  }

  // ============================================================
  // Inventory Transactions
  // ============================================================

  getInventoryTransactions(): InventoryTransaction[] {
    return this.getItems<InventoryTransaction>(this.STORAGE_KEYS.inventoryTransactions);
  }

  addInventoryTransaction(transaction: InventoryTransaction): void {
    const items = this.getInventoryTransactions();
    items.push({ ...transaction, createdAt: new Date().toISOString() });
    this.setItems(this.STORAGE_KEYS.inventoryTransactions, items);
  }

  // ============================================================
  // Quality Inspections
  // ============================================================

  getInspections(): QualityInspection[] {
    return this.getItems<QualityInspection>(this.STORAGE_KEYS.inspections);
  }

  getInspection(id: string): QualityInspection | undefined {
    return this.getInspections().find(i => i.id === id);
  }

  saveInspection(inspection: QualityInspection): void {
    const items = this.getInspections();
    const index = items.findIndex(i => i.id === inspection.id);
    if (index >= 0) {
      items[index] = { ...inspection, updatedAt: new Date().toISOString() };
    } else {
      items.push({ ...inspection, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.setItems(this.STORAGE_KEYS.inspections, items);
  }

  deleteInspection(id: string): { success: boolean; message: string } {
    const defects = this.getDefects().filter(d => d.inspectionId === id);
    if (defects.length > 0) {
      return { success: false, message: `Cannot delete: ${defects.length} defect(s) linked to this inspection.` };
    }
    const items = this.getInspections().filter(i => i.id !== id);
    this.setItems(this.STORAGE_KEYS.inspections, items);
    return { success: true, message: 'Inspection deleted successfully.' };
  }

  // ============================================================
  // Defects
  // ============================================================

  getDefects(): Defect[] {
    return this.getItems<Defect>(this.STORAGE_KEYS.defects);
  }

  getDefect(id: string): Defect | undefined {
    return this.getDefects().find(d => d.id === id);
  }

  saveDefect(defect: Defect): void {
    const items = this.getDefects();
    const index = items.findIndex(d => d.id === defect.id);
    if (index >= 0) {
      items[index] = { ...defect, updatedAt: new Date().toISOString() };
    } else {
      items.push({ ...defect, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.setItems(this.STORAGE_KEYS.defects, items);
  }

  deleteDefect(id: string): { success: boolean; message: string } {
    const actions = this.getCorrectiveActions().filter(a => a.defectId === id);
    if (actions.length > 0) {
      return { success: false, message: `Cannot delete: ${actions.length} corrective action(s) linked to this defect.` };
    }
    const items = this.getDefects().filter(d => d.id !== id);
    this.setItems(this.STORAGE_KEYS.defects, items);
    return { success: true, message: 'Defect deleted successfully.' };
  }

  // ============================================================
  // Corrective Actions
  // ============================================================

  getCorrectiveActions(): CorrectiveAction[] {
    return this.getItems<CorrectiveAction>(this.STORAGE_KEYS.correctiveActions);
  }

  getCorrectiveAction(id: string): CorrectiveAction | undefined {
    return this.getCorrectiveActions().find(a => a.id === id);
  }

  saveCorrectiveAction(action: CorrectiveAction): void {
    const items = this.getCorrectiveActions();
    const index = items.findIndex(a => a.id === action.id);
    if (index >= 0) {
      items[index] = { ...action, updatedAt: new Date().toISOString() };
    } else {
      items.push({ ...action, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.setItems(this.STORAGE_KEYS.correctiveActions, items);
  }

  deleteCorrectiveAction(id: string): void {
    const items = this.getCorrectiveActions().filter(a => a.id !== id);
    this.setItems(this.STORAGE_KEYS.correctiveActions, items);
  }

  // ============================================================
  // Downtime Events
  // ============================================================

  getDowntimeEvents(): DowntimeEvent[] {
    return this.getItems<DowntimeEvent>(this.STORAGE_KEYS.downtimeEvents);
  }

  getDowntimeEvent(id: string): DowntimeEvent | undefined {
    return this.getDowntimeEvents().find(d => d.id === id);
  }

  saveDowntimeEvent(event: DowntimeEvent): void {
    const items = this.getDowntimeEvents();
    const index = items.findIndex(d => d.id === event.id);
    if (index >= 0) {
      items[index] = event;
    } else {
      items.push({ ...event, createdAt: new Date().toISOString() });
    }
    this.setItems(this.STORAGE_KEYS.downtimeEvents, items);
  }

  deleteDowntimeEvent(id: string): void {
    const items = this.getDowntimeEvents().filter(d => d.id !== id);
    this.setItems(this.STORAGE_KEYS.downtimeEvents, items);
  }

  // ============================================================
  // Dashboard Statistics (calculated from actual data)
  // ============================================================

  getDashboardStats(): DashboardStats {
    const orders = this.getProductionOrders();
    const workCentres = this.getWorkCentres();
    const materials = this.getRawMaterials();
    const inspections = this.getInspections();
    const defects = this.getDefects();
    const actions = this.getCorrectiveActions();
    const downtimeEvents = this.getDowntimeEvents();

    const now = new Date();
    const delayedOrders = orders.filter(o =>
      (o.status === 'Planned' || o.status === 'In Progress') &&
      new Date(o.plannedEndDate) < now
    ).length;

    const totalProduced = orders.reduce((sum, o) => sum + (o.producedQuantity || 0), 0);
    const totalAccepted = orders.reduce((sum, o) => sum + (o.acceptedQuantity || 0), 0);
    const totalRejected = orders.reduce((sum, o) => sum + (o.rejectedQuantity || 0), 0);

    const productionYield = totalProduced > 0 ? (totalAccepted / totalProduced) * 100 : 0;
    const defectRate = totalProduced > 0 ? (totalRejected / totalProduced) * 100 : 0;

    const totalDowntime = downtimeEvents.reduce((sum, d) => sum + (d.durationMinutes || 0), 0);

    return {
      totalOrders: orders.length,
      plannedOrders: orders.filter(o => o.status === 'Planned').length,
      inProgressOrders: orders.filter(o => o.status === 'In Progress').length,
      completedOrders: orders.filter(o => o.status === 'Completed').length,
      delayedOrders,
      onHoldOrders: orders.filter(o => o.status === 'On Hold').length,
      cancelledOrders: orders.filter(o => o.status === 'Cancelled').length,
      totalWorkCentres: workCentres.length,
      activeWorkCentres: workCentres.filter(w => w.isAvailable).length,
      totalMaterials: materials.length,
      lowStockMaterials: materials.filter(m => m.availableStock <= m.minimumStockLevel).length,
      totalInspections: inspections.length,
      passedInspections: inspections.filter(i => i.overallResult === 'Pass').length,
      failedInspections: inspections.filter(i => i.overallResult === 'Fail').length,
      totalDefects: defects.length,
      openDefects: defects.filter(d => d.status === 'Open' || d.status === 'Under Investigation').length,
      pendingCorrectiveActions: actions.filter(a => a.status === 'Pending' || a.status === 'In Progress').length,
      totalDowntimeMinutes: totalDowntime,
      productionYield: Math.round(productionYield * 100) / 100,
      defectRate: Math.round(defectRate * 100) / 100
    };
  }

  // ============================================================
  // Data Reset
  // ============================================================

  resetAllData(): void {
    Object.values(this.STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    this.initializeDemoData();
  }

  // ============================================================
  // Demo Data Initialization
  // ============================================================

  private initializeDemoData(): void {
    if (localStorage.getItem(this.STORAGE_KEYS.initialized)) return;

    // Finished Products
    const products: FinishedProduct[] = [
      { id: 'FP-001', name: 'Steel Gear Assembly', description: 'High-precision steel gear assembly for automotive use', category: 'Automotive Parts' },
      { id: 'FP-002', name: 'Aluminum Bracket', description: 'Lightweight aluminum mounting bracket', category: 'Structural Components' },
      { id: 'FP-003', name: 'Copper Wire Harness', description: 'Multi-conductor copper wire harness', category: 'Electrical Components' },
      { id: 'FP-004', name: 'Plastic Housing Unit', description: 'Injection-molded plastic housing', category: 'Enclosures' },
      { id: 'FP-005', name: 'Stainless Steel Valve', description: 'Industrial stainless steel control valve', category: 'Flow Control' }
    ];
    this.setItems(this.STORAGE_KEYS.finishedProducts, products);

    // Work Centres
    const workCentres: WorkCentre[] = [
      { id: 'WC-001', name: 'CNC Machining Centre 1', description: 'High-precision CNC milling and turning', machineType: 'CNC Mill', capacity: 100, capacityUnit: 'units/day', isAvailable: true, location: 'Building A - Floor 1', operatingHours: '06:00 - 22:00', maintenanceSchedule: 'Monthly', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'WC-002', name: 'Assembly Line A', description: 'Main assembly line for gear assemblies', machineType: 'Assembly Line', capacity: 200, capacityUnit: 'units/day', isAvailable: true, location: 'Building A - Floor 2', operatingHours: '06:00 - 22:00', maintenanceSchedule: 'Weekly', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'WC-003', name: 'Welding Station B', description: 'MIG and TIG welding station', machineType: 'Welding Station', capacity: 50, capacityUnit: 'units/day', isAvailable: true, location: 'Building B - Floor 1', operatingHours: '08:00 - 18:00', maintenanceSchedule: 'Bi-weekly', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'WC-004', name: 'Injection Moulding Unit', description: 'Plastic injection moulding machine', machineType: 'Injection Mould', capacity: 500, capacityUnit: 'units/day', isAvailable: false, location: 'Building C - Floor 1', operatingHours: '24/7', maintenanceSchedule: 'Monthly', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'WC-005', name: 'Quality Testing Lab', description: 'Material and product quality testing laboratory', machineType: 'Testing Equipment', capacity: 150, capacityUnit: 'tests/day', isAvailable: true, location: 'Building A - Floor 3', operatingHours: '08:00 - 17:00', maintenanceSchedule: 'Quarterly', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.setItems(this.STORAGE_KEYS.workCentres, workCentres);

    // Raw Materials
    const materials: RawMaterial[] = [
      { id: 'RM-001', name: 'Carbon Steel Rod', category: 'Metals', unit: 'kg', unitCost: 45.00, supplierName: 'Tata Steel Ltd', supplierContact: 'sales@tatasteel.com', availableStock: 500, minimumStockLevel: 100, reservedStock: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'RM-002', name: 'Aluminum Sheet 2mm', category: 'Metals', unit: 'sheets', unitCost: 120.00, supplierName: 'Hindalco Industries', supplierContact: 'orders@hindalco.com', availableStock: 200, minimumStockLevel: 50, reservedStock: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'RM-003', name: 'Copper Wire 1.5mm', category: 'Electrical', unit: 'metres', unitCost: 8.50, supplierName: 'Finolex Cables', supplierContact: 'supply@finolex.com', availableStock: 5000, minimumStockLevel: 1000, reservedStock: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'RM-004', name: 'ABS Plastic Granules', category: 'Plastics', unit: 'kg', unitCost: 95.00, supplierName: 'Supreme Petrochem', supplierContact: 'bulk@supreme.com', availableStock: 300, minimumStockLevel: 100, reservedStock: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'RM-005', name: 'Stainless Steel 316L', category: 'Metals', unit: 'kg', unitCost: 210.00, supplierName: 'Jindal Stainless', supplierContact: 'sales@jindalsteel.com', availableStock: 150, minimumStockLevel: 40, reservedStock: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'RM-006', name: 'Bearing Grease', category: 'Lubricants', unit: 'litres', unitCost: 320.00, supplierName: 'Castrol India', supplierContact: 'industrial@castrol.com', availableStock: 25, minimumStockLevel: 10, reservedStock: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'RM-007', name: 'Rubber Seal O-Ring', category: 'Seals', unit: 'pieces', unitCost: 5.00, supplierName: 'Parker Hannifin', supplierContact: 'orders@parker.com', availableStock: 2000, minimumStockLevel: 500, reservedStock: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'RM-008', name: 'Insulation Tape', category: 'Electrical', unit: 'rolls', unitCost: 35.00, supplierName: '3M India', supplierContact: 'supply@3m.co.in', availableStock: 80, minimumStockLevel: 30, reservedStock: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.setItems(this.STORAGE_KEYS.rawMaterials, materials);

    // Bill of Materials
    const boms: BillOfMaterials[] = [
      {
        id: 'BOM-001', productId: 'FP-001', productName: 'Steel Gear Assembly',
        materials: [
          { materialId: 'RM-001', materialName: 'Carbon Steel Rod', quantityRequired: 2.5, unit: 'kg' },
          { materialId: 'RM-006', materialName: 'Bearing Grease', quantityRequired: 0.1, unit: 'litres' },
          { materialId: 'RM-007', materialName: 'Rubber Seal O-Ring', quantityRequired: 4, unit: 'pieces' }
        ],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: 'BOM-002', productId: 'FP-002', productName: 'Aluminum Bracket',
        materials: [
          { materialId: 'RM-002', materialName: 'Aluminum Sheet 2mm', quantityRequired: 1, unit: 'sheets' }
        ],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: 'BOM-003', productId: 'FP-003', productName: 'Copper Wire Harness',
        materials: [
          { materialId: 'RM-003', materialName: 'Copper Wire 1.5mm', quantityRequired: 15, unit: 'metres' },
          { materialId: 'RM-008', materialName: 'Insulation Tape', quantityRequired: 0.5, unit: 'rolls' }
        ],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: 'BOM-004', productId: 'FP-004', productName: 'Plastic Housing Unit',
        materials: [
          { materialId: 'RM-004', materialName: 'ABS Plastic Granules', quantityRequired: 0.8, unit: 'kg' },
          { materialId: 'RM-007', materialName: 'Rubber Seal O-Ring', quantityRequired: 2, unit: 'pieces' }
        ],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: 'BOM-005', productId: 'FP-005', productName: 'Stainless Steel Valve',
        materials: [
          { materialId: 'RM-005', materialName: 'Stainless Steel 316L', quantityRequired: 3, unit: 'kg' },
          { materialId: 'RM-007', materialName: 'Rubber Seal O-Ring', quantityRequired: 6, unit: 'pieces' },
          { materialId: 'RM-006', materialName: 'Bearing Grease', quantityRequired: 0.05, unit: 'litres' }
        ],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }
    ];
    this.setItems(this.STORAGE_KEYS.boms, boms);

    // Production Orders
    const today = new Date();
    const orders: ProductionOrder[] = [
      {
        id: 'PO-001', productId: 'FP-001', productName: 'Steel Gear Assembly', quantity: 50,
        producedQuantity: 48, acceptedQuantity: 45, rejectedQuantity: 3,
        priority: 'High', status: 'Completed',
        plannedStartDate: new Date(today.getTime() - 14 * 86400000).toISOString().split('T')[0],
        plannedEndDate: new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0],
        actualStartDate: new Date(today.getTime() - 14 * 86400000).toISOString().split('T')[0],
        actualEndDate: new Date(today.getTime() - 8 * 86400000).toISOString().split('T')[0],
        workCentreId: 'WC-001', notes: 'First batch completed successfully', materialsConsumed: true,
        createdAt: new Date(today.getTime() - 15 * 86400000).toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: 'PO-002', productId: 'FP-002', productName: 'Aluminum Bracket', quantity: 100,
        producedQuantity: 60, acceptedQuantity: 58, rejectedQuantity: 2,
        priority: 'Medium', status: 'In Progress',
        plannedStartDate: new Date(today.getTime() - 3 * 86400000).toISOString().split('T')[0],
        plannedEndDate: new Date(today.getTime() + 4 * 86400000).toISOString().split('T')[0],
        actualStartDate: new Date(today.getTime() - 3 * 86400000).toISOString().split('T')[0],
        workCentreId: 'WC-003', notes: 'Production on track', materialsConsumed: true,
        createdAt: new Date(today.getTime() - 5 * 86400000).toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: 'PO-003', productId: 'FP-003', productName: 'Copper Wire Harness', quantity: 200,
        producedQuantity: 0, acceptedQuantity: 0, rejectedQuantity: 0,
        priority: 'High', status: 'Planned',
        plannedStartDate: new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0],
        plannedEndDate: new Date(today.getTime() + 10 * 86400000).toISOString().split('T')[0],
        workCentreId: 'WC-002', notes: 'Awaiting material confirmation', materialsConsumed: false,
        createdAt: new Date(today.getTime() - 2 * 86400000).toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: 'PO-004', productId: 'FP-005', productName: 'Stainless Steel Valve', quantity: 30,
        producedQuantity: 0, acceptedQuantity: 0, rejectedQuantity: 0,
        priority: 'Low', status: 'On Hold',
        plannedStartDate: new Date(today.getTime() - 5 * 86400000).toISOString().split('T')[0],
        plannedEndDate: new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0],
        notes: 'On hold due to material shortage', materialsConsumed: false,
        createdAt: new Date(today.getTime() - 7 * 86400000).toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: 'PO-005', productId: 'FP-004', productName: 'Plastic Housing Unit', quantity: 500,
        producedQuantity: 0, acceptedQuantity: 0, rejectedQuantity: 0,
        priority: 'Critical', status: 'Planned',
        plannedStartDate: new Date(today.getTime() + 5 * 86400000).toISOString().split('T')[0],
        plannedEndDate: new Date(today.getTime() + 15 * 86400000).toISOString().split('T')[0],
        workCentreId: 'WC-004', notes: 'Large batch - high priority', materialsConsumed: false,
        createdAt: new Date(today.getTime() - 1 * 86400000).toISOString(), updatedAt: new Date().toISOString()
      }
    ];
    this.setItems(this.STORAGE_KEYS.productionOrders, orders);

    // Schedules
    const schedules: ProductionSchedule[] = [
      { id: 'SCH-001', productionOrderId: 'PO-001', workCentreId: 'WC-001', scheduledStartDate: orders[0].plannedStartDate, scheduledEndDate: orders[0].plannedEndDate, actualStartDate: orders[0].actualStartDate, actualEndDate: orders[0].actualEndDate, status: 'Completed', notes: 'Completed on schedule', createdAt: new Date().toISOString() },
      { id: 'SCH-002', productionOrderId: 'PO-002', workCentreId: 'WC-003', scheduledStartDate: orders[1].plannedStartDate, scheduledEndDate: orders[1].plannedEndDate, actualStartDate: orders[1].actualStartDate, status: 'In Progress', notes: 'On track', createdAt: new Date().toISOString() },
      { id: 'SCH-003', productionOrderId: 'PO-003', workCentreId: 'WC-002', scheduledStartDate: orders[2].plannedStartDate, scheduledEndDate: orders[2].plannedEndDate, status: 'Scheduled', notes: 'Pending material availability', createdAt: new Date().toISOString() }
    ];
    this.setItems(this.STORAGE_KEYS.schedules, schedules);

    // Quality Inspections
    const inspections: QualityInspection[] = [
      {
        id: 'QI-001', productionOrderId: 'PO-001', productName: 'Steel Gear Assembly', batchNumber: 'BATCH-001',
        inspectionDate: new Date(today.getTime() - 8 * 86400000).toISOString().split('T')[0],
        inspectorName: 'Rajesh Kumar',
        checkpoints: [
          { name: 'Dimensional Accuracy', description: 'Check gear dimensions against specification', result: 'Pass', notes: 'Within tolerance' },
          { name: 'Surface Finish', description: 'Visual and tactile surface quality check', result: 'Pass', notes: 'Smooth finish achieved' },
          { name: 'Hardness Test', description: 'Rockwell hardness test', result: 'Pass', notes: 'HRC 58-62 confirmed' },
          { name: 'Assembly Fit', description: 'Check gear mesh and assembly fit', result: 'Fail', notes: '3 units had minor misalignment' }
        ],
        overallResult: 'Partial', notes: 'Most units passed, 3 units need rework',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: 'QI-002', productionOrderId: 'PO-002', productName: 'Aluminum Bracket', batchNumber: 'BATCH-002',
        inspectionDate: new Date(today.getTime() - 1 * 86400000).toISOString().split('T')[0],
        inspectorName: 'Priya Sharma',
        checkpoints: [
          { name: 'Weight Check', description: 'Verify bracket weight within spec', result: 'Pass', notes: 'All within 5% tolerance' },
          { name: 'Bend Test', description: 'Structural integrity bend test', result: 'Pass', notes: 'No deformation observed' },
          { name: 'Hole Alignment', description: 'Mounting hole position accuracy', result: 'Pass', notes: 'Aligned correctly' }
        ],
        overallResult: 'Pass', notes: 'All checkpoints passed',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }
    ];
    this.setItems(this.STORAGE_KEYS.inspections, inspections);

    // Defects
    const defects: Defect[] = [
      {
        id: 'DEF-001', productionOrderId: 'PO-001', inspectionId: 'QI-001', productName: 'Steel Gear Assembly',
        defectType: 'Dimensional', severity: 'Medium', description: 'Gear tooth alignment off by 0.2mm in 3 units',
        affectedQuantity: 3, status: 'Under Investigation',
        reportedDate: new Date(today.getTime() - 8 * 86400000).toISOString().split('T')[0],
        resolutionNotes: '',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: 'DEF-002', productionOrderId: 'PO-002', productName: 'Aluminum Bracket',
        defectType: 'Surface', severity: 'Low', description: 'Minor surface scratches on 2 brackets',
        affectedQuantity: 2, status: 'Open',
        reportedDate: new Date(today.getTime() - 1 * 86400000).toISOString().split('T')[0],
        resolutionNotes: '',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }
    ];
    this.setItems(this.STORAGE_KEYS.defects, defects);

    // Corrective Actions
    const actions: CorrectiveAction[] = [
      {
        id: 'CA-001', defectId: 'DEF-001', description: 'Recalibrate CNC machine tooling for gear cutting',
        assignedTo: 'Amit Patel', targetDate: new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0],
        status: 'In Progress', resolutionDetails: 'Tooling calibration in progress',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }
    ];
    this.setItems(this.STORAGE_KEYS.correctiveActions, actions);

    // Downtime Events
    const downtimeEvents: DowntimeEvent[] = [
      {
        id: 'DT-001', workCentreId: 'WC-004', workCentreName: 'Injection Moulding Unit',
        reason: 'Hydraulic pump failure', category: 'Mechanical Failure',
        startTime: new Date(today.getTime() - 2 * 86400000).toISOString(),
        endTime: new Date(today.getTime() - 1 * 86400000).toISOString(),
        durationMinutes: 1440, notes: 'Pump replaced, unit back online',
        createdAt: new Date().toISOString()
      },
      {
        id: 'DT-002', workCentreId: 'WC-001', workCentreName: 'CNC Machining Centre 1',
        reason: 'Scheduled tool change and calibration', category: 'Planned Maintenance',
        startTime: new Date(today.getTime() - 10 * 86400000).toISOString(),
        endTime: new Date(today.getTime() - 10 * 86400000 + 4 * 3600000).toISOString(),
        durationMinutes: 240, notes: 'Regular maintenance completed',
        createdAt: new Date().toISOString()
      },
      {
        id: 'DT-003', workCentreId: 'WC-003', workCentreName: 'Welding Station B',
        reason: 'Welding wire feed motor malfunction', category: 'Electrical Issue',
        startTime: new Date(today.getTime() - 5 * 86400000).toISOString(),
        endTime: new Date(today.getTime() - 5 * 86400000 + 6 * 3600000).toISOString(),
        durationMinutes: 360, notes: 'Motor replaced with spare unit',
        createdAt: new Date().toISOString()
      }
    ];
    this.setItems(this.STORAGE_KEYS.downtimeEvents, downtimeEvents);

    // Inventory Transactions (demo)
    const transactions: InventoryTransaction[] = [
      { id: 'IT-001', materialId: 'RM-001', materialName: 'Carbon Steel Rod', transactionType: 'Receipt', quantity: 200, notes: 'Initial stock receipt from Tata Steel', date: new Date(today.getTime() - 20 * 86400000).toISOString().split('T')[0], createdAt: new Date().toISOString() },
      { id: 'IT-002', materialId: 'RM-001', materialName: 'Carbon Steel Rod', transactionType: 'Consumption', quantity: -125, productionOrderId: 'PO-001', notes: 'Consumed for PO-001', date: new Date(today.getTime() - 14 * 86400000).toISOString().split('T')[0], createdAt: new Date().toISOString() },
      { id: 'IT-003', materialId: 'RM-002', materialName: 'Aluminum Sheet 2mm', transactionType: 'Receipt', quantity: 100, notes: 'Stock replenishment', date: new Date(today.getTime() - 10 * 86400000).toISOString().split('T')[0], createdAt: new Date().toISOString() },
      { id: 'IT-004', materialId: 'RM-002', materialName: 'Aluminum Sheet 2mm', transactionType: 'Consumption', quantity: -60, productionOrderId: 'PO-002', notes: 'Consumed for PO-002', date: new Date(today.getTime() - 3 * 86400000).toISOString().split('T')[0], createdAt: new Date().toISOString() }
    ];
    this.setItems(this.STORAGE_KEYS.inventoryTransactions, transactions);

    localStorage.setItem(this.STORAGE_KEYS.initialized, 'true');
  }
}

