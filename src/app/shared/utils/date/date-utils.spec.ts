import { TestBed } from '@angular/core/testing';

import { DateUtils } from './date-utils';

describe('DateUtils', () => {
  let service: DateUtils;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DateUtils);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
