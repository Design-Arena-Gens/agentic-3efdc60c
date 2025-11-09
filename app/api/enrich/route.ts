import { NextRequest, NextResponse } from 'next/server';

interface CatalogRow {
  [key: string]: string;
}

interface EnrichRequest {
  catalog: CatalogRow[];
  rawData: string;
}

export async function POST(request: NextRequest) {
  try {
    const { catalog, rawData }: EnrichRequest = await request.json();

    if (!catalog || !Array.isArray(catalog) || catalog.length === 0) {
      return NextResponse.json(
        { error: 'Invalid catalog data' },
        { status: 400 }
      );
    }

    if (!rawData) {
      return NextResponse.json(
        { error: 'Raw data is required' },
        { status: 400 }
      );
    }

    // Parse raw data - assuming it contains product information
    const rawLines = rawData.split('\n').filter(line => line.trim());
    const enrichedCatalog = catalog.map((row, index) => {
      const enrichedRow = { ...row };

      // Extract information from raw data if available
      const rawInfo = rawLines[index] || rawLines[0] || '';

      // Enrich fields based on raw data and platform requirements
      // Common fields for e-commerce platforms
      const platforms = ['amazon', 'flipkart', 'meesho', 'myntra'];

      // Generate platform-specific data
      if (!enrichedRow['product_title'] && rawInfo) {
        enrichedRow['product_title'] = generateTitle(rawInfo, row);
      }

      if (!enrichedRow['description']) {
        enrichedRow['description'] = generateDescription(rawInfo, row);
      }

      if (!enrichedRow['price']) {
        enrichedRow['price'] = extractPrice(rawInfo) || row['price'] || '';
      }

      if (!enrichedRow['mrp']) {
        const price = parseFloat(enrichedRow['price']) || 0;
        enrichedRow['mrp'] = price > 0 ? (price * 1.25).toFixed(2) : '';
      }

      // Platform-specific fields
      platforms.forEach(platform => {
        if (!enrichedRow[`${platform}_title`]) {
          enrichedRow[`${platform}_title`] = generatePlatformTitle(platform, enrichedRow, rawInfo);
        }

        if (!enrichedRow[`${platform}_description`]) {
          enrichedRow[`${platform}_description`] = generatePlatformDescription(platform, enrichedRow, rawInfo);
        }

        if (!enrichedRow[`${platform}_keywords`]) {
          enrichedRow[`${platform}_keywords`] = generateKeywords(platform, enrichedRow, rawInfo);
        }
      });

      // Common fields
      if (!enrichedRow['brand']) {
        enrichedRow['brand'] = extractBrand(rawInfo, row);
      }

      if (!enrichedRow['category']) {
        enrichedRow['category'] = extractCategory(rawInfo, row);
      }

      if (!enrichedRow['color']) {
        enrichedRow['color'] = extractColor(rawInfo, row);
      }

      if (!enrichedRow['size']) {
        enrichedRow['size'] = extractSize(rawInfo, row);
      }

      if (!enrichedRow['material']) {
        enrichedRow['material'] = extractMaterial(rawInfo, row);
      }

      if (!enrichedRow['stock_status']) {
        enrichedRow['stock_status'] = 'In Stock';
      }

      return enrichedRow;
    });

    return NextResponse.json({ enrichedCatalog });
  } catch (error) {
    console.error('Error enriching catalog:', error);
    return NextResponse.json(
      { error: 'Failed to enrich catalog' },
      { status: 500 }
    );
  }
}

function generateTitle(rawData: string, row: CatalogRow): string {
  const title = row['title'] || row['name'] || row['product_name'] || '';
  if (title) return title;

  const words = rawData.split(/\s+/).slice(0, 10).join(' ');
  return words || 'Product';
}

function generateDescription(rawData: string, row: CatalogRow): string {
  const desc = row['description'] || row['desc'] || '';
  if (desc) return desc;

  const brand = row['brand'] || 'Quality';
  const category = row['category'] || 'product';
  const color = row['color'] || '';
  const material = row['material'] || '';

  let description = `Premium ${brand} ${category}`;
  if (color) description += ` in ${color} color`;
  if (material) description += ` made with ${material}`;
  description += `. ${rawData.slice(0, 200)}`;

  return description;
}

function generatePlatformTitle(platform: string, row: CatalogRow, rawData: string): string {
  const baseTitle = row['product_title'] || row['title'] || 'Product';
  const brand = row['brand'] || '';
  const color = row['color'] || '';
  const size = row['size'] || '';

  switch (platform) {
    case 'amazon':
      return `${brand} ${baseTitle} ${color} ${size}`.trim().replace(/\s+/g, ' ');
    case 'flipkart':
      return `${baseTitle} (${brand}) - ${color}`.trim().replace(/\s+/g, ' ');
    case 'meesho':
      return `${baseTitle} ${color} ${size}`.trim().replace(/\s+/g, ' ');
    case 'myntra':
      return `${brand} ${color} ${baseTitle}`.trim().replace(/\s+/g, ' ');
    default:
      return baseTitle;
  }
}

function generatePlatformDescription(platform: string, row: CatalogRow, rawData: string): string {
  const baseDesc = row['description'] || '';
  const brand = row['brand'] || '';
  const material = row['material'] || '';

  switch (platform) {
    case 'amazon':
      return `${baseDesc}\n\nKey Features:\n• Premium Quality\n• ${brand} Brand\n• ${material} Material\n• Fast Delivery Available`;
    case 'flipkart':
      return `${baseDesc}\n\nSpecifications:\n- Brand: ${brand}\n- Material: ${material}\n- Quality Assured`;
    case 'meesho':
      return `${baseDesc}\n\n✓ Best Price\n✓ Quality Product\n✓ Fast Shipping`;
    case 'myntra':
      return `${baseDesc}\n\nProduct Details:\n• Brand: ${brand}\n• Material: ${material}\n• Style & Comfort Combined`;
    default:
      return baseDesc;
  }
}

function generateKeywords(platform: string, row: CatalogRow, rawData: string): string {
  const brand = row['brand'] || '';
  const category = row['category'] || '';
  const color = row['color'] || '';
  const material = row['material'] || '';

  const keywords = [
    brand,
    category,
    color,
    material,
    'quality',
    'premium',
    'best',
    'latest',
    'trending'
  ].filter(Boolean);

  return keywords.join(', ');
}

function extractPrice(rawData: string): string {
  const priceMatch = rawData.match(/₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/);
  if (priceMatch) {
    return priceMatch[1].replace(',', '');
  }
  return '';
}

function extractBrand(rawData: string, row: CatalogRow): string {
  if (row['brand']) return row['brand'];

  const commonBrands = ['Nike', 'Adidas', 'Puma', 'Reebok', 'Levi\'s', 'Zara', 'H&M', 'Generic'];
  const lowerData = rawData.toLowerCase();

  for (const brand of commonBrands) {
    if (lowerData.includes(brand.toLowerCase())) {
      return brand;
    }
  }

  return 'Generic';
}

function extractCategory(rawData: string, row: CatalogRow): string {
  if (row['category']) return row['category'];

  const categories = ['Shirt', 'T-Shirt', 'Jeans', 'Shoes', 'Dress', 'Jacket', 'Accessories'];
  const lowerData = rawData.toLowerCase();

  for (const cat of categories) {
    if (lowerData.includes(cat.toLowerCase())) {
      return cat;
    }
  }

  return 'General';
}

function extractColor(rawData: string, row: CatalogRow): string {
  if (row['color']) return row['color'];

  const colors = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Grey', 'Brown', 'Navy'];
  const lowerData = rawData.toLowerCase();

  for (const color of colors) {
    if (lowerData.includes(color.toLowerCase())) {
      return color;
    }
  }

  return 'Multi';
}

function extractSize(rawData: string, row: CatalogRow): string {
  if (row['size']) return row['size'];

  const sizeMatch = rawData.match(/\b(XS|S|M|L|XL|XXL|XXXL|28|30|32|34|36|38|40|42)\b/i);
  if (sizeMatch) {
    return sizeMatch[1].toUpperCase();
  }

  return 'M';
}

function extractMaterial(rawData: string, row: CatalogRow): string {
  if (row['material']) return row['material'];

  const materials = ['Cotton', 'Polyester', 'Silk', 'Wool', 'Denim', 'Leather', 'Synthetic'];
  const lowerData = rawData.toLowerCase();

  for (const material of materials) {
    if (lowerData.includes(material.toLowerCase())) {
      return material;
    }
  }

  return 'Cotton';
}
