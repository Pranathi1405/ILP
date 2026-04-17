import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RazorpayLoaderService {
  private loadingPromise: Promise<boolean> | null = null;

  load(): Promise<boolean> {
    // Already available
    if ((window as any).Razorpay) {
      return Promise.resolve(true);
    }

    // Prevent multiple script injections
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });

    return this.loadingPromise;
  }
}
