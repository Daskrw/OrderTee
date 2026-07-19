import { supabase } from '@/lib/supabase'
import type { Product, AddonGroup, AddonOption, Category } from '@/types/database'

export type ProductListItem = Pick<
  Product,
  'id' | 'name' | 'description' | 'price' | 'image_url' | 'category_id' |
  'is_sold_out' | 'is_recommended' | 'is_visible' | 'sort_order' | 'created_at'
> & {
  category: Pick<Category, 'id' | 'name'> | null
}

export type AddonGroupWithOptions = AddonGroup & {
  addon_options: AddonOption[]
}

export type ProductWithAddons = Product & {
  category: Pick<Category, 'id' | 'name'> | null
  addon_groups: AddonGroupWithOptions[]
}

interface FetchProductsOptions {
  categoryId?: string | null
  search?: string
}

export async function fetchProducts(opts: FetchProductsOptions = {}): Promise<ProductListItem[]> {
  let query = supabase
    .from('products')
    .select(`
      id, name, description, price, image_url, category_id,
      is_sold_out, is_recommended, sort_order, created_at,
      category:categories(id, name)
    `)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })

  if (opts.categoryId) {
    query = query.eq('category_id', opts.categoryId)
  }

  if (opts.search && opts.search.trim()) {
    query = query.ilike('name', `%${opts.search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ProductListItem[]
}

export async function fetchProductById(id: string): Promise<ProductWithAddons | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name),
      product_addon_groups(
        addon_group:addon_groups(
          id, name, is_required, is_multiple, sort_order, created_at,
          addon_options(id, group_id, name, additional_price, sort_order, created_at)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null

  // Flatten junction table and sort
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any
  const addonGroups: AddonGroupWithOptions[] = (raw.product_addon_groups ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((pag: any) => pag.addon_group)
    .filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((g: any) => ({
      ...g,
      addon_options: [...(g.addon_options ?? [])].sort(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any, b: any) => a.sort_order - b.sort_order
      ),
    }))

  return { ...raw, addon_groups: addonGroups } as ProductWithAddons
}

export async function fetchAdminProducts(): Promise<ProductListItem[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, description, price, image_url, category_id,
      is_sold_out, is_recommended, is_visible, sort_order, created_at,
      category:categories(id, name)
    `)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as ProductListItem[]
}

export async function createProduct(
  product: Omit<Product, 'id' | 'created_at' | 'category' | 'addon_groups'>,
  addonGroupIds: string[]
): Promise<void> {
  // Insert product
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newProduct, error: productError } = await (supabase as any)
    .from('products')
    .insert(product)
    .select()
    .single()

  if (productError || !newProduct) throw productError

  // Insert addon links
  if (addonGroupIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: linkError } = await (supabase as any)
      .from('product_addon_groups')
      .insert(
        addonGroupIds.map((groupId) => ({
          product_id: newProduct.id,
          addon_group_id: groupId,
        }))
      )
    if (linkError) throw linkError
  }
}

export async function updateProduct(
  id: string,
  product: Partial<Omit<Product, 'id' | 'created_at' | 'category' | 'addon_groups'>>,
  addonGroupIds: string[]
): Promise<void> {
  // Update product
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: productError } = await (supabase as any)
    .from('products')
    .update(product)
    .eq('id', id)

  if (productError) throw productError

  // Update addon links (delete all, insert new)
  const { error: deleteError } = await supabase
    .from('product_addon_groups')
    .delete()
    .eq('product_id', id)

  if (deleteError) throw deleteError

  if (addonGroupIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: linkError } = await (supabase as any)
      .from('product_addon_groups')
      .insert(
        addonGroupIds.map((groupId) => ({
          product_id: id,
          addon_group_id: groupId,
        }))
      )
    if (linkError) throw linkError
  }
}

export async function deleteProduct(id: string): Promise<void> {
  // Delete links first
  await supabase.from('product_addon_groups').delete().eq('product_id', id)
  
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw error
}
