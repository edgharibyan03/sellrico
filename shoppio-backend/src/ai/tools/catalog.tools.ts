import { AIToolDefinition } from '../types/ai.types';

/** Application-level catalog tools — provider-agnostic. */
export const CATALOG_TOOLS: AIToolDefinition[] = [
  {
    name: 'list_products',
    description:
      'List products from the store catalog. Use for catalog browsing and price filters (e.g. products under a max price). Prefer this over inventing a list from memory.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'Max products to return (1-12). Default 8.',
        },
        category: {
          type: 'string',
          description: 'Optional category name filter',
        },
        maxPrice: {
          type: 'number',
          description: 'Only products with price less than or equal to this amount',
        },
        minPrice: {
          type: 'number',
          description: 'Only products with price greater than or equal to this amount',
        },
      },
    },
  },
  {
    name: 'search_products',
    description:
      'Search the store catalog by free-text query. Use for product discovery, filtering, comparison, or recommendations. Supports price filters. Include distinctive brand/model/SKU words from the customer together with product-type words when available. Results are relevance-ranked across name, description, category, SKU, tags, and attributes.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search keywords — keep brand/model/SKU terms exactly as the customer said them (e.g. “blue running shoes Nike”, “iPhone 15 128GB”)',
        },
        limit: {
          type: 'integer',
          description: 'Max products to return (1-10)',
        },
        maxPrice: {
          type: 'number',
          description: 'Only products with price less than or equal to this amount',
        },
        minPrice: {
          type: 'number',
          description: 'Only products with price greater than or equal to this amount',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_product',
    description: 'Get details for a single product by its Shoppio product id.',
    parameters: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'Shoppio product UUID',
        },
      },
      required: ['productId'],
    },
  },
  {
    name: 'get_product_categories',
    description: 'List distinct product categories available in this store catalog.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];
