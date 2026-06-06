import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.customersService.findAll(query);
  }

  @Get('debt-summary')
  getDebtSummary() {
    return this.customersService.getDebtSummary();
  }

  @Get('groups')
  getGroups() {
    return this.customersService.getGroups();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
