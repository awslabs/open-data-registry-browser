# AWS Open Data UI Redesign

## Overview
This pull request redesigns the Registry of Open Data website to match the modern AWS design system used on https://aws.amazon.com/opendata/. The redesign focuses on improved user experience, accessibility, and visual consistency with AWS branding.

## Design Changes

### 🎨 **Visual Design**
- **Modern AWS Color Palette**: Updated to use official AWS colors including AWS Orange (#FF9900), AWS Blue (#232F3E), and modern gray scale
- **Typography**: Integrated Inter font family alongside Amazon Ember for improved readability
- **Rounded Corners**: Added consistent border radius (8px for cards, 4px for small elements)
- **Modern Shadows**: Implemented subtle drop shadows with hover effects
- **Card-based Layout**: Transformed dataset listings into modern card components

### 🏗️ **Layout Improvements**
- **Responsive Grid**: Enhanced responsive design for better mobile experience
- **Improved Spacing**: Consistent spacing using CSS custom properties
- **Modern Navigation**: Updated header with better alignment and hover effects
- **Sidebar Enhancement**: Redesigned sidebar with better organization and visual hierarchy

### 🎯 **User Experience**
- **Interactive Elements**: Added hover effects and smooth transitions
- **Better Accessibility**: Improved semantic HTML, ARIA labels, and focus states
- **Modern Buttons**: Redesigned buttons with AWS styling and proper states
- **Enhanced Tags**: Modern tag design with better contrast and interaction

### 📱 **Responsive Design**
- **Mobile-First**: Improved mobile experience with better touch targets
- **Flexible Layout**: Better adaptation to different screen sizes
- **Optimized Typography**: Responsive font sizes and line heights

## Technical Changes

### CSS Architecture
- **CSS Custom Properties**: Implemented CSS variables for consistent theming
- **Modern Selectors**: Updated CSS to use modern best practices
- **Component-Based**: Organized styles into logical components
- **Performance**: Optimized CSS for better loading and rendering

### HTML Structure
- **Semantic HTML**: Improved semantic structure with proper HTML5 elements
- **Accessibility**: Added ARIA labels, roles, and proper heading hierarchy
- **Modern Attributes**: Updated attributes for better SEO and accessibility

### Key Components Updated

#### 1. **Dataset Cards**
```css
.dataset {
  background: var(--aws-white);
  border: 1px solid var(--aws-gray-200);
  border-radius: var(--aws-border-radius);
  padding: 24px;
  box-shadow: var(--aws-shadow);
  transition: all 0.2s ease;
}
```

#### 2. **Modern Buttons**
```css
.btn-primary {
  background-color: var(--aws-orange);
  border-radius: var(--aws-border-radius);
  font-weight: 500;
  transition: all 0.2s ease;
}
```

#### 3. **Enhanced Navigation**
```css
.roda-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}
```

#### 4. **Modern Tags**
```css
.tag {
  padding: 4px 12px;
  border-radius: var(--aws-border-radius-small);
  background-color: var(--aws-gray-100);
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

## Color Palette

### Primary Colors
- **AWS Orange**: `#FF9900` (Primary actions, hover states)
- **AWS Blue**: `#232F3E` (Headers, navigation)
- **AWS Light Blue**: `#4B9CD3` (Links, secondary actions)

### Neutral Colors
- **Gray Scale**: From `#F2F3F3` (lightest) to `#1B2631` (darkest)
- **White**: `#FFFFFF` (Backgrounds, cards)

### Semantic Colors
- **Success**: `#1E8900` (Sustainability tags, success states)
- **Focus**: `#FF9900` (Focus outlines, active states)

## Accessibility Improvements

### 🔍 **Focus Management**
- Consistent focus outlines using AWS Orange
- Proper tab order and keyboard navigation
- Skip links for screen readers

### 📖 **Screen Reader Support**
- Proper ARIA labels and roles
- Semantic HTML structure
- Descriptive link text and button labels

### 🎨 **Visual Accessibility**
- High contrast ratios for text
- Clear visual hierarchy
- Consistent interactive states

## Performance Optimizations

### 🚀 **CSS Performance**
- Reduced CSS specificity
- Optimized selectors
- Efficient animations using transforms

### 📦 **Asset Optimization**
- Modern font loading strategies
- Optimized color palette
- Efficient hover effects

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Progressive enhancement for older browsers
- Responsive design for all screen sizes

## Files Modified

### Core Styles
- `src/css/main.css` - Complete redesign with modern AWS styling

### Templates
- `src/partials/header.hbs` - Updated navigation structure
- `src/partials/about.hbs` - Enhanced sidebar with modern layout
- `src/index.hbs` - Improved dataset card structure

### Test Files
- `tests/test-data-compare/index.html` - Updated to match new design
- `tests/test-data-compare/usgs-landsat/index.html` - Updated
- `tests/test-data-compare/change-log/index.html` - Updated

## Testing
- ✅ **Build Process**: All builds complete successfully
- ✅ **Test Suite**: All existing tests pass
- ✅ **Responsive Design**: Tested across multiple screen sizes
- ✅ **Accessibility**: Improved ARIA support and keyboard navigation
- ✅ **Cross-Browser**: Compatible with modern browsers

## Before vs After

### Before
- Basic Bootstrap 3 styling
- Limited color palette
- Basic card design
- Minimal hover effects
- Standard form elements

### After
- Modern AWS design system
- Rich color palette with CSS variables
- Enhanced card design with shadows and hover effects
- Smooth transitions and animations
- Modern form styling with focus states

## Future Enhancements
- Dark mode support using CSS custom properties
- Additional micro-interactions
- Enhanced loading states
- Progressive Web App features

## Migration Notes
- All existing functionality preserved
- No breaking changes to URLs or data structure
- Backward compatible with existing bookmarks
- SEO-friendly semantic improvements