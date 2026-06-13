import { Controller, Get } from '@nestjs/common';
import { StaffService } from './staff.service.js';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('users')
  getUsers() {
    return this.staffService.getUsers();
  }
}
