# Setup Icons for Tauri Desktop App
Write-Host "========================================"
Write-Host "Setting up Tauri Icons"
Write-Host "========================================"
Write-Host ""

$iconsDir = "src-tauri\icons"

# Create icons directory
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

Write-Host "Generating icons using Tauri CLI..."
Write-Host ""

# Check if we have a source icon
$sourceIcon = "$iconsDir\icon.png"

if (-not (Test-Path $sourceIcon)) {
    Write-Host "No source icon found. Creating a simple one..."
    Write-Host ""
    Write-Host "Creating 1024x1024 placeholder icon..."
    
    # Use Tauri CLI to generate icons from a simple source
    # First, let's create a minimal valid icon using Node.js
    $nodeScript = @"
const fs = require('fs');
const path = require('path');

// Create a simple 1024x1024 PNG placeholder
// This is a minimal valid PNG (1x1 transparent pixel)
const minimalPNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x04, 0x00, // 1024x1024
    0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82
]);

fs.writeFileSync('$iconsDir\icon.png', minimalPNG);
console.log('Created placeholder icon.png');
"@
    
    $nodeScript | node
}

# Now use Tauri CLI to generate all required icon sizes
Write-Host "Generating all icon sizes from source..."
Write-Host ""

if (Test-Path $sourceIcon) {
    npx @tauri-apps/cli icon "$sourceIcon" --output "$iconsDir"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Icons generated successfully!"
    } else {
        Write-Host "Icon generation failed. Creating minimal placeholders..."
        # Create minimal placeholder files
        Copy-Item "$sourceIcon" "$iconsDir\32x32.png" -ErrorAction SilentlyContinue
        Copy-Item "$sourceIcon" "$iconsDir\128x128.png" -ErrorAction SilentlyContinue
        Copy-Item "$sourceIcon" "$iconsDir\128x128@2x.png" -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "Creating minimal placeholder icons..."
    # Create minimal icon files to allow build to proceed
    $placeholder = [byte[]](0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
    
    # Create all required icon files
    @("32x32.png", "128x128.png", "128x128@2x.png") | ForEach-Object {
        [System.IO.File]::WriteAllBytes("$iconsDir\$_", $placeholder)
    }
    
    Write-Host "Placeholder icons created. Build should proceed."
    Write-Host "Replace with proper icons for production."
}

Write-Host ""
Write-Host "========================================"
Write-Host "Icon setup complete!"
Write-Host "========================================"

