import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FAQ_KEYS } from '../landing.constants';
import { LandingFaqComponent } from './landing-faq.component';

describe('LandingFaqComponent', () => {
  let fixture: ComponentFixture<LandingFaqComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingFaqComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingFaqComponent);
    fixture.detectChanges();
  });

  it('should render all configured FAQ items with the first item expanded by default', () => {
    const details = fixture.nativeElement.querySelectorAll('details.faq-item');
    expect(details.length).toBe(FAQ_KEYS.length);
    expect(details[0].hasAttribute('open')).toBe(true);
    expect(details[1].hasAttribute('open')).toBe(false);
  });
});
