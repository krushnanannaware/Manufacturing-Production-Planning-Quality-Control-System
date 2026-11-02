import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DataService } from '../core/services/data.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private dataService = inject(DataService);
  isCollapsed = false;

  navGroups = [
    {
      label: 'Dashboard',
      icon: '📊',
      items: [
        { label: 'Overview', route: '/dashboard', icon: '🏠' }
      ]
    },
    {
      label: 'Production (Member 1)',
      icon: '🏭',
      items: [
        { label: 'Production Orders', route: '/production/orders', icon: '📋' },
        { label: 'Work Centres', route: '/production/work-centres', icon: '⚙️' },
        { label: 'Scheduling', route: '/production/scheduling', icon: '📅' }
      ]
    },
    {
      label: 'Materials (Member 2)',
      icon: '📦',
      items: [
        { label: 'Raw Materials', route: '/materials/raw-materials', icon: '🧱' },
        { label: 'Bill of Materials', route: '/materials/bom', icon: '📄' },
        { label: 'Inventory', route: '/materials/inventory', icon: '📊' },
        { label: 'Inventory Reports', route: '/materials/inventory-reports', icon: '📑' }
      ]
    },
    {
      label: 'Quality (Member 3)',
      icon: '✅',
      items: [
        { label: 'Inspections', route: '/quality/inspections', icon: '🔍' },
        { label: 'Defects', route: '/quality/defects', icon: '⚠️' },
        { label: 'Corrective Actions', route: '/quality/corrective-actions', icon: '🔧' }
      ]
    },
    {
      label: 'Analytics (Member 4)',
      icon: '📈',
      items: [
        { label: 'Downtime', route: '/analytics/downtime', icon: '⏱️' },
        { label: 'Yield Analytics', route: '/analytics/yield', icon: '📉' }
      ]
    }
  ];

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  resetData(): void {
    if (confirm('Reset all data to demo defaults? This cannot be undone.')) {
      this.dataService.resetAllData();
      window.location.reload();
    }
  }
}

