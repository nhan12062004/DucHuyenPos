import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, Headers,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto.js';
import { CreateCustomerGroupDto, UpdateCustomerGroupDto } from './dto/customer-group.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { decodeActorHeader } from '../../common/actor-header.js';

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

  @Post('groups')
  createGroup(@Body() dto: CreateCustomerGroupDto) {
    return this.customersService.createGroup(dto);
  }

  @Put('groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: UpdateCustomerGroupDto) {
    return this.customersService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  removeGroup(@Param('id') id: string) {
    return this.customersService.removeGroup(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateCustomerDto,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.customersService.create(dto, { actorId, actorName: decodeActorHeader(actorName) });
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.customersService.update(id, dto, { actorId, actorName: decodeActorHeader(actorName) });
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.customersService.remove(id, { actorId, actorName: decodeActorHeader(actorName) });
  }
}
