// ============================================================
// Manufacturing Production Planning & Quality Control System
// Core Data Models / TypeScript Interfaces
// ============================================================

// ---- Production Module (Member 1) ----

export type ProductionStatus = 'Planned' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ProductionOrder {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  producedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  priority: Priority;
  status: ProductionStatus;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  workCentreId?: string;
  notes: string;
  materialsConsumed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkCentre {
  id: string;
  name: string;
  description: string;
  machineType: string;
  capacity: number;
  capacityUnit: string;
  isAvailable: boolean;
  location: string;
  operatingHours: string;
  maintenanceSchedule: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionSchedule {
  id: string;
  productionOrderId: string;
  workCentreId: string;
  scheduledStartDate: string;
  scheduledEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Delayed' | 'Cancelled';
  notes: string;
  createdAt: string;
}

// ---- Materials Module (Member 2) ----

export interface RawMaterial {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  supplierName: string;
  supplierContact: string;
  availableStock: number;
  minimumStockLevel: number;
  reservedStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillOfMaterials {
  id: string;
  productId: string;
  productName: string;
  materials: BomMaterial[];
  createdAt: string;
  updatedAt: string;
}

export interface BomMaterial {
  materialId: string;
  materialName: string;
  quantityRequired: number;
  unit: string;
}

export type InventoryTransactionType = 'Receipt' | 'Consumption' | 'Adjustment' | 'Reservation' | 'Release';

export interface InventoryTransaction {
  id: string;
  materialId: string;
  materialName: string;
  transactionType: InventoryTransactionType;
  quantity: number;
  productionOrderId?: string;
  notes: string;
  date: string;
  createdAt: string;
}

// ---- Quality Module (Member 3) ----

export interface QualityInspection {
  id: string;
  productionOrderId: string;
  productName: string;
  batchNumber: string;
  inspectionDate: string;
  inspectorName: string;
  checkpoints: InspectionCheckpoint[];
  overallResult: 'Pass' | 'Fail' | 'Partial';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionCheckpoint {
  name: string;
  description: string;
  result: 'Pass' | 'Fail' | 'N/A';
  notes: string;
}

export type DefectSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type DefectStatus = 'Open' | 'Under Investigation' | 'Resolved' | 'Closed';

export interface Defect {
  id: string;
  productionOrderId: string;
  inspectionId?: string;
  productName: string;
  defectType: string;
  severity: DefectSeverity;
  description: string;
  affectedQuantity: number;
  status: DefectStatus;
  reportedDate: string;
  resolvedDate?: string;
  resolutionNotes: string;
  createdAt: string;
  updatedAt: string;
}

export type CorrectiveActionStatus = 'Pending' | 'In Progress' | 'Completed' | 'Verified' | 'Closed';

export interface CorrectiveAction {
  id: string;
  defectId: string;
  description: string;
  assignedTo: string;
  targetDate: string;
  completedDate?: string;
  status: CorrectiveActionStatus;
  resolutionDetails: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Dashboard Module (Member 4) ----

export type DowntimeCategory = 'Mechanical Failure' | 'Electrical Issue' | 'Maintenance' | 'Material Shortage' | 'Quality Issue' | 'Operator Error' | 'Planned Maintenance' | 'Other';

export interface DowntimeEvent {
  id: string;
  workCentreId: string;
  workCentreName: string;
  reason: string;
  category: DowntimeCategory;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  notes: string;
  createdAt: string;
}

// ---- Shared Types ----

export interface FinishedProduct {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface DashboardStats {
  totalOrders: number;
  plannedOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  delayedOrders: number;
  onHoldOrders: number;
  cancelledOrders: number;
  totalWorkCentres: number;
  activeWorkCentres: number;
  totalMaterials: number;
  lowStockMaterials: number;
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  totalDefects: number;
  openDefects: number;
  pendingCorrectiveActions: number;
  totalDowntimeMinutes: number;
  productionYield: number;
  defectRate: number;
}

