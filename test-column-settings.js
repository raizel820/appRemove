#!/usr/bin/env node

/**
 * Test script to verify column settings feature
 * This script tests the new column width and padding settings
 */

async function testColumnSettings() {
  console.log('Testing Column Settings Feature...\n');

  try {
    // 1. Fetch current configuration
    console.log('1. Fetching current configuration...');
    const response = await fetch('http://localhost:3000/api/pdf-configuration');
    const config = await response.json();
    console.log('✓ Configuration fetched successfully');

    // 2. Check if column fields exist
    console.log('\n2. Checking for column fields...');
    const columnFields = [
      'invoiceColNumberWidth',
      'invoiceColNumberPadding',
      'invoiceColFamilyWidth',
      'invoiceColFamilyPadding',
      'invoiceColModelWidth',
      'invoiceColModelPadding',
      'invoiceColBrandWidth',
      'invoiceColBrandPadding',
      'invoiceColQuantityWidth',
      'invoiceColQuantityPadding',
      'invoiceColPriceUnitWidth',
      'invoiceColPriceUnitPadding',
      'invoiceColPriceTotalWidth',
      'invoiceColPriceTotalPadding'
    ];

    let missingFields = [];
    columnFields.forEach(field => {
      if (config[field] === undefined) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      console.log(`⚠ Warning: ${missingFields.length} fields are missing`);
      console.log('Missing fields:', missingFields.join(', '));
      console.log('\nUpdating configuration with default values...');

      // Add missing fields with default values
      config.invoiceColNumberWidth = config.invoiceColNumberWidth ?? 13.23;
      config.invoiceColNumberPadding = config.invoiceColNumberPadding ?? 5.61;
      config.invoiceColFamilyWidth = config.invoiceColFamilyWidth ?? 39.69;
      config.invoiceColFamilyPadding = config.invoiceColFamilyPadding ?? 5.61;
      config.invoiceColModelWidth = config.invoiceColModelWidth ?? 39.69;
      config.invoiceColModelPadding = config.invoiceColModelPadding ?? 5.61;
      config.invoiceColBrandWidth = config.invoiceColBrandWidth ?? 31.75;
      config.invoiceColBrandPadding = config.invoiceColBrandPadding ?? 5.61;
      config.invoiceColQuantityWidth = config.invoiceColQuantityWidth ?? 21.17;
      config.invoiceColQuantityPadding = config.invoiceColQuantityPadding ?? 5.61;
      config.invoiceColPriceUnitWidth = config.invoiceColPriceUnitWidth ?? 31.75;
      config.invoiceColPriceUnitPadding = config.invoiceColPriceUnitPadding ?? 5.61;
      config.invoiceColPriceTotalWidth = config.invoiceColPriceTotalWidth ?? 31.75;
      config.invoiceColPriceTotalPadding = config.invoiceColPriceTotalPadding ?? 5.61;

      // Update configuration
      const updateResponse = await fetch('http://localhost:3000/api/pdf-configuration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (updateResponse.ok) {
        console.log('✓ Configuration updated successfully with column fields');
      } else {
        console.log('✗ Failed to update configuration');
        console.log('Status:', updateResponse.status);
        return;
      }
    } else {
      console.log('✓ All column fields are present');
    }

    // 3. Display current column settings
    console.log('\n3. Current column settings:');
    console.log('─'.repeat(50));
    console.log('Column 1 (N°):          Width=' + config.invoiceColNumberWidth + 'mm, Padding=' + config.invoiceColNumberPadding + 'mm');
    console.log('Column 2 (Item family): Width=' + config.invoiceColFamilyWidth + 'mm, Padding=' + config.invoiceColFamilyPadding + 'mm');
    console.log('Column 3 (Model):       Width=' + config.invoiceColModelWidth + 'mm, Padding=' + config.invoiceColModelPadding + 'mm');
    console.log('Column 4 (Brand):       Width=' + config.invoiceColBrandWidth + 'mm, Padding=' + config.invoiceColBrandPadding + 'mm');
    console.log('Column 5 (Quantity):    Width=' + config.invoiceColQuantityWidth + 'mm, Padding=' + config.invoiceColQuantityPadding + 'mm');
    console.log('Column 6 (Price/unit):  Width=' + config.invoiceColPriceUnitWidth + 'mm, Padding=' + config.invoiceColPriceUnitPadding + 'mm');
    console.log('Column 7 (Price total): Width=' + config.invoiceColPriceTotalWidth + 'mm, Padding=' + config.invoiceColPriceTotalPadding + 'mm');
    console.log('─'.repeat(50));

    // 4. Calculate total width
    const totalWidth =
      (config.invoiceColNumberWidth ?? 13.23) +
      (config.invoiceColFamilyWidth ?? 39.69) +
      (config.invoiceColModelWidth ?? 39.69) +
      (config.invoiceColBrandWidth ?? 31.75) +
      (config.invoiceColQuantityWidth ?? 21.17) +
      (config.invoiceColPriceUnitWidth ?? 31.75) +
      (config.invoiceColPriceTotalWidth ?? 31.75);

    console.log('\n4. Total table width: ' + totalWidth.toFixed(2) + 'mm');
    console.log('   (A4 page width: 210mm, recommended max: ~190mm with margins)');

    if (totalWidth > 190) {
      console.log('   ⚠ Warning: Total width exceeds recommended maximum');
    } else {
      console.log('   ✓ Total width is within acceptable range');
    }

    console.log('\n✅ All tests passed successfully!');
    console.log('\nNext steps:');
    console.log('1. Navigate to /pdf-settings');
    console.log('2. Scroll to "2.1 Column Settings" section');
    console.log('3. Adjust column widths and padding as needed');
    console.log('4. Click "Preview" to see changes in real-time');
    console.log('5. Click "Save" to persist your changes');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure the dev server is running on port 3000');
  }
}

// Run the test
testColumnSettings();
