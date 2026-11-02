import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NotificationService } from '../core/services/notification.service';
import { DataService } from '../core/services/data.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  notificationService = inject(NotificationService);
  private dataService = inject(DataService);

  currentTime = new Date();
  private timer: any;

  ngOnInit(): void {
    this.timer = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  resetAllData(): void {
    if (confirm('Reset entire system to factory demo dataset? Any custom entries will be reverted.')) {
      this.dataService.resetAllData();
      this.notificationService.success('System database restored to factory demo state.');
      setTimeout(() => window.location.reload(), 400);
    }
  }
}
