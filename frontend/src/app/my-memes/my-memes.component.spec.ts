import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyMemesComponent } from './my-memes.component';

describe('MyMemesComponent', () => {
  let component: MyMemesComponent;
  let fixture: ComponentFixture<MyMemesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MyMemesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MyMemesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
