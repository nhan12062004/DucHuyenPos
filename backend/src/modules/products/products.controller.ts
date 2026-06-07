import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, Headers,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { decodeActorHeader } from '../../common/actor-header.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.productsService.findAll(query);
  }

  @Get('stock-summary')
  getStockSummary() {
    return this.productsService.getStockSummary();
  }

  @Get('categories')
  getCategories() {
    return this.productsService.getCategories();
  }

  @Get('brands')
  getBrands() {
    return this.productsService.getBrands();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateProductDto,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.productsService.create(dto, { actorId, actorName: decodeActorHeader(actorName) });
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.productsService.update(id, dto, { actorId, actorName: decodeActorHeader(actorName) });
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.productsService.remove(id, { actorId, actorName: decodeActorHeader(actorName) });
  }
}
