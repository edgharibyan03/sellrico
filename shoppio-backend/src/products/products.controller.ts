import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteAuthGuard } from '../auth/guards/site-auth.guard';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { CurrentSite } from '../common/decorators/current-site.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { SyncProductsDto } from './dto/sync-products.dto';
import { PaginatedProductsDto, ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('sync')
  @UseGuards(SiteAuthGuard)
  @ApiBearerAuth('site-jwt')
  @ApiOperation({
    summary: 'Upsert products from the WordPress plugin',
    description:
      'Plugin endpoint. Site is resolved from the site JWT. Use replaceAll=true for a full catalog replace.',
  })
  sync(@CurrentSite() site: AuthenticatedSite, @Body() dto: SyncProductsDto) {
    return this.productsService.syncFromPlugin(site, dto);
  }

  @Get()
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiTags('dashboard-products')
  @ApiOperation({
    summary: 'List products for the merchant dashboard',
    description: 'Scoped to sites owned by the authenticated user.',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('siteId') siteId?: string,
    @Query('q') q?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(8), ParseIntPipe) pageSize?: number,
  ): Promise<PaginatedProductsDto> {
    return this.productsService.listForDashboard(user, {
      siteId,
      q,
      page,
      pageSize,
    });
  }
}
