"use client";

import { useEffect, useState } from "react";
import { Package, Search } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/shared/page-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UpgradePrompt } from "@/components/billing/plan-states";
import { getUsageSummary } from "@/lib/api/usage";
import { listProductCategories, listProducts } from "@/lib/api/products";
import { listSites } from "@/lib/api/sites";
import { getUserFacingError } from "@/lib/api/client";
import type { Paginated, Product, Site } from "@/lib/types";

function ProductThumb({
  product,
  sizeClass = "size-10",
}: {
  product: Product;
  sizeClass?: string;
}) {
  if (product.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.imageUrl}
        alt={product.name}
        className={`${sizeClass} shrink-0 rounded-md object-cover bg-muted`}
      />
    );
  }
  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground`}
    >
      <Package className="size-4" />
    </div>
  );
}

export default function ProductsPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [siteId, setSiteId] = useState("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [productLimit, setProductLimit] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(opts?: {
    q?: string;
    page?: number;
    siteId?: string;
    category?: string;
  }) {
    setLoading(true);
    setError(null);
    try {
      const siteList = sites.length ? sites : await listSites();
      if (!sites.length) setSites(siteList);
      const selected = opts?.siteId ?? siteId;
      const selectedCategory = opts?.category ?? category;
      const siteFilter = selected === "all" ? undefined : selected;
      const categoryList = await listProductCategories({ siteId: siteFilter });
      setCategories(categoryList);
      const effectiveCategory =
        selectedCategory !== "all" && categoryList.includes(selectedCategory)
          ? selectedCategory
          : "all";
      if (effectiveCategory !== category) {
        setCategory(effectiveCategory);
      }
      const result = await listProducts({
        siteId: siteFilter,
        q: opts?.q ?? query,
        category:
          effectiveCategory === "all" ? undefined : effectiveCategory,
        page: opts?.page ?? page,
        pageSize: 8,
      });
      setData(result);
      try {
        const usage = await getUsageSummary();
        const products = usage.metrics.find(
          (metric) => metric.key === "products",
        );
        if (products?.limit != null && products.used >= products.limit) {
          setProductLimit(
            `${products.used.toLocaleString()} / ${products.limit.toLocaleString()} products synced. Plan limit reached. Upgrade to sync more products.`,
          );
        } else {
          setProductLimit(null);
        }
      } catch {
        setProductLimit(null);
      }
    } catch (err) {
      setError(getUserFacingError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stockBadge(status: Product["stockStatus"]) {
    if (status === "in_stock") return <Badge>In stock</Badge>;
    if (status === "out_of_stock")
      return <Badge variant="destructive">Out of stock</Badge>;
    return <Badge variant="secondary">On backorder</Badge>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products"
        description="WooCommerce products synced through Shoppio. Exclusions stay available on every plan."
      />

      {productLimit ? (
        <UpgradePrompt title="Plan limit reached" description={productLimit} />
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                void load({ q: query, page: 1 });
              }
            }}
          />
        </div>
        <Select
          value={siteId}
          onValueChange={(v) => {
            if (!v) return;
            setSiteId(v);
            setCategory("all");
            setPage(1);
            void load({ siteId: v, category: "all", page: 1 });
          }}
        >
          <SelectTrigger className="w-full lg:w-56">
            <SelectValue placeholder="Filter by site" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All sites</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.domain}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={category}
          onValueChange={(v) => {
            if (!v) return;
            setCategory(v);
            setPage(1);
            void load({ category: v, page: 1 });
          }}
        >
          <SelectTrigger className="w-full lg:w-64">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            setPage(1);
            void load({ q: query, page: 1 });
          }}
        >
          Search
        </Button>
      </div>

      {loading ? <LoadingBlock /> : null}
      {error ? (
        <ErrorState description={error} onRetry={() => void load()} />
      ) : null}

      {!loading && !error && data && data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Your products are syncing, or this store has no catalog items."
        />
      ) : null}

      {!loading && !error && data && data.items.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ProductThumb product={product} />
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.price != null
                        ? `${product.currency} ${product.price.toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell>{stockBadge(product.stockStatus)}</TableCell>
                    <TableCell>{product.category ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.syncStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(product.updatedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {data.items.map((product) => (
              <article
                key={product.id}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex gap-3">
                  <ProductThumb product={product} sizeClass="size-14" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {product.price != null
                        ? `${product.currency} ${product.price.toFixed(2)}`
                        : "No price"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {stockBadge(product.stockStatus)}
                      <Badge variant="outline">{product.syncStatus}</Badge>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.page} of {data.totalPages} · {data.total} products
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const next = page - 1;
                  setPage(next);
                  void load({ page: next });
                }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  void load({ page: next });
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
