# AWS Data Exchange Banner Removal

## Overview
This pull request removes the "The Registry of Open Data on AWS is now available on AWS Data Exchange" banner from all pages of the open-data-registry-browser website.

## Changes Made

### Files Modified

#### 1. Template Files
- **`src/partials/header.hbs`**: Removed the entire banner HTML structure including:
  - `#adx-banner` div and all its contents
  - `#spacer` div used for layout spacing
  - JavaScript reference to `banner.js`

#### 2. JavaScript Files
- **`src/js/banner.js`**: Deleted entirely (no longer needed)

#### 3. CSS Files
- **`src/css/main.css`**: Removed all banner-related CSS rules:
  - `#adx-banner` styles and media queries
  - `#spacer` styles
  - `.adx-banner-text` styles
  - `.adx-banner-button` styles
  - `.adx-banner-container` styles
  - `.adx-close-button` styles
  - `.icon-info` styles

#### 4. Test Comparison Files
Updated test comparison files to match the new banner-free output:
- **`tests/test-data-compare/index.html`**
- **`tests/test-data-compare/usgs-landsat/index.html`**
- **`tests/test-data-compare/change-log/index.html`**

## Banner Content Removed

The following banner content has been completely removed:

```html
<div id="adx-banner">
  <div class="adx-banner-container">
    <img src="/img/info.svg" class="icon-info">
    <div class="adx-banner-text">
      <b>The Registry of Open Data on AWS is now available on AWS Data Exchange</b>
      <div>
        <span>All datasets on the Registry of Open Data are now discoverable on AWS Data Exchange alongside 3,000+ existing data products from category-leading data providers across industries. Explore the catalog to find open, free, and commercial data sets.</span>
        <a href="https://docs.aws.amazon.com/data-exchange/" target="_blank">Learn more about AWS Data Exchange <img src="/img/external.svg" class="icon" /></a>
      </div>
    </div>
  </div>
  <div class="adx-banner-container">
    <button class="adx-banner-button">
      Explore the catalog
      <img src="/img/external_black.svg" class="icon">
    </button>
    <div class="adx-close-button"><img src="/img/close.svg" class="icon"></div>
  </div>
</div>
<div id="spacer"></div>
```

## Impact Assessment

### Visual Impact
- **Banner Removal**: The blue AWS Data Exchange banner no longer appears at the top of any page
- **Layout**: Page content now starts immediately below the navigation bar
- **Spacing**: Removed the spacer div that was used to accommodate the fixed banner

### Functional Impact
- **No Breaking Changes**: All existing functionality remains intact
- **Navigation**: Site navigation and all links continue to work as expected
- **Performance**: Slight improvement due to removed CSS and JavaScript

### User Experience
- **Cleaner Interface**: Pages now have a cleaner, less cluttered appearance
- **More Content Space**: Additional vertical space available for actual content
- **Faster Loading**: Reduced CSS and no banner.js to load

## Testing
- ✅ Build process: `npm run build` - Success
- ✅ Test suite: `npm test` - All tests pass
- ✅ Banner verification: No traces of AWS Data Exchange banner remain in generated files

## Files Affected
- `src/partials/header.hbs` - Banner HTML removed
- `src/js/banner.js` - File deleted
- `src/css/main.css` - Banner CSS removed
- `tests/test-data-compare/index.html` - Updated
- `tests/test-data-compare/usgs-landsat/index.html` - Updated
- `tests/test-data-compare/change-log/index.html` - Updated
- `BANNER_REMOVAL.md` - This documentation (new)

## Verification
To verify the banner removal:
```bash
npm run build
npm test
# Check that no AWS Data Exchange references remain:
grep -r "AWS Data Exchange" dist/
grep -r "adx-banner" dist/
```

Both grep commands should return no results, confirming complete removal.