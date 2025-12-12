# SkyView Dynamics - Version Updater
# Automatically updates cache-busting version in index.html

Write-Host "🚁 SkyView Dynamics - Version Updater" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Generate new version timestamp
$newVersion = Get-Date -Format "yyyyMMddHHmmss"

Write-Host "📅 New version: $newVersion" -ForegroundColor Green

# Check if index.html exists
if (-not (Test-Path "index.html")) {
    Write-Host "❌ Error: index.html not found!" -ForegroundColor Red
    Write-Host "   Make sure you're in the skyview directory" -ForegroundColor Yellow
    exit 1
}

# Read the file
$content = Get-Content "index.html" -Raw

# Count current versions
$cssMatches = [regex]::Matches($content, 'style\.css\?v=(\d+)')
$jsMatches = [regex]::Matches($content, 'script\.js\?v=(\d+)')

if ($cssMatches.Count -eq 0 -and $jsMatches.Count -eq 0) {
    Write-Host "⚠️  Warning: No version parameters found!" -ForegroundColor Yellow
    Write-Host "   Adding version parameters..." -ForegroundColor Yellow
    
    # Add version parameters if they don't exist
    $content = $content -replace 'href="style\.css"', "href=`"style.css?v=$newVersion`""
    $content = $content -replace 'src="script\.js"', "src=`"script.js?v=$newVersion`""
} else {
    # Show current versions
    if ($cssMatches.Count -gt 0) {
        $oldCssVersion = $cssMatches[0].Groups[1].Value
        Write-Host "📝 Current CSS version: $oldCssVersion" -ForegroundColor Gray
    }
    if ($jsMatches.Count -gt 0) {
        $oldJsVersion = $jsMatches[0].Groups[1].Value
        Write-Host "📝 Current JS version:  $oldJsVersion" -ForegroundColor Gray
    }
    
    # Update versions
    $content = $content -replace 'style\.css\?v=\d+', "style.css?v=$newVersion"
    $content = $content -replace 'script\.js\?v=\d+', "script.js?v=$newVersion"
}

# Write back to file
$content | Set-Content "index.html" -NoNewline

Write-Host ""
Write-Host "✅ Version updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   • CSS: style.css?v=$newVersion" -ForegroundColor White
Write-Host "   • JS:  script.js?v=$newVersion" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Test your changes locally" -ForegroundColor White
Write-Host "   2. Hard refresh browser (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "   3. Commit and deploy" -ForegroundColor White
Write-Host ""
