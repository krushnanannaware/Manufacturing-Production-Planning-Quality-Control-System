import { Injectable } from '@angular/core';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  notifications: Notification[] = [];

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      message,
      type,
      timestamp: Date.now()
    };
    this.notifications.push(notification);
    setTimeout(() => this.dismiss(notification.id), 4000);
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error'); }
  warning(message: string): void { this.show(message, 'warning'); }
  info(message: string): void { this.show(message, 'info'); }

  dismiss(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }
}

