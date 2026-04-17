import { CommonModule} from '@angular/common';
import { Component} from '@angular/core';
import { LandingTitleComponent } from "../landing-title/landing-title";
import { FreeTrialComponent } from "../free-trial-classes/free-trial/free-trial";
import { ChooseUsComponent } from "../choose-us/choose-us";
import { UsersComponent } from "../users/users";
import { RouterLink } from "@angular/router";
import { Footer } from "../footer/footer";

@Component({
  selector: 'app-landingpage',
  imports: [CommonModule, LandingTitleComponent, FreeTrialComponent, ChooseUsComponent, UsersComponent, RouterLink, Footer],
  templateUrl: './landingpage.html',
  styleUrl: './landingpage.css',
  standalone:true
})
export class LandingpageComponent{
    isMenuOpen = false;
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
    }
    closeMenu() {
      this.isMenuOpen = false;
    }
    scrollTo(section: string) {
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
