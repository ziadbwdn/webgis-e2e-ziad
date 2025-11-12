## 🎯 **FEATURE: Collapsible Sidebars**

### **Design Pattern:**
- **Left Sidebar:** Slide out/in (overlay style when collapsed)
- **Right Panel:** Collapse to hamburger menu button
- **State Persistence:** Remember user's preference in localStorage

---

## 📋 **IMPLEMENTATION GUIDE**

### **Step 1: Update HTML Structure**

Modify your `dashboard.html`:

```html
<!-- Add toggle buttons -->
<aside class="sidebar" id="left-sidebar">
  <!-- Add collapse button at top -->
  <button class="sidebar-collapse-btn" id="toggle-left-sidebar" title="Toggle Sidebar">
    <span class="icon">◀</span>
  </button>
  
  <div class="sidebar-header">
    <h2>MapLibreGIS</h2>
    <p class="user-info">Welcome, <span id="user-name">Test User</span></p>
  </div>
  
  <!-- Rest of sidebar content -->
  <nav class="sidebar-nav">
    <!-- Your existing nav items -->
  </nav>
  
  <div class="sidebar-footer">
    <button id="upload-layer-btn" class="btn-upload">+ Upload Layer</button>
    <button id="logout-btn" class="btn-logout">Logout</button>
  </div>
</aside>

<!-- Right panel with collapse -->
<div class="control-panel" id="right-panel">
  <!-- Hamburger toggle button (shows when collapsed) -->
  <button class="panel-toggle-btn" id="toggle-right-panel" title="Toggle Panel">
    <span class="hamburger-icon">☰</span>
  </button>
  
  <!-- Panel content (existing structure) -->
  <div class="panel-content">
    <!-- Base layer section -->
    <div class="panel-section">
      <h3>Base layer</h3>
      <!-- existing radio buttons -->
    </div>
    
    <!-- Layers section -->
    <div class="panel-section">
      <h3>Layers</h3>
      <!-- existing layer list -->
    </div>
    
    <!-- Legend section -->
    <div class="panel-section">
      <h3>Legend</h3>
      <!-- existing legend -->
    </div>
  </div>
</div>
```

---

### **Step 2: Add CSS for Collapsible States**

Add to your `<style>` section in `dashboard.html`:

```css
/* ========================================
   LEFT SIDEBAR COLLAPSE
   ======================================== */

.sidebar {
  position: relative;
  transition: transform 0.3s ease, width 0.3s ease;
}

.sidebar.collapsed {
  transform: translateX(-250px);
  width: 0;
}

/* Collapse button for left sidebar */
.sidebar-collapse-btn {
  position: absolute;
  top: 20px;
  right: -15px;
  width: 30px;
  height: 30px;
  background: #34495e;
  border: 2px solid #2c3e50;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  transition: all 0.3s ease;
  font-size: 16px;
}

.sidebar-collapse-btn:hover {
  background: #2c3e50;
  transform: scale(1.1);
}

.sidebar.collapsed .sidebar-collapse-btn .icon::before {
  content: '▶';
}

/* When sidebar is collapsed, show overlay toggle button */
.sidebar-overlay-toggle {
  position: fixed;
  top: 20px;
  left: 20px;
  width: 50px;
  height: 50px;
  background: #2c3e50;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 999;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  font-size: 24px;
}

.sidebar.collapsed ~ .sidebar-overlay-toggle {
  display: flex;
}

/* ========================================
   RIGHT PANEL COLLAPSE
   ======================================== */

.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 280px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
  z-index: 1000;
}

.control-panel.collapsed {
  width: 50px;
  height: 50px;
  overflow: hidden;
}

.control-panel.collapsed .panel-content {
  display: none;
}

/* Hamburger toggle button */
.panel-toggle-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  background: transparent;
  border: none;
  color: #2c3e50;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  z-index: 1;
  transition: transform 0.3s ease;
}

.panel-toggle-btn:hover {
  transform: scale(1.1);
}

/* When collapsed, center the hamburger */
.control-panel.collapsed .panel-toggle-btn {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.control-panel.collapsed {
  background: #2c3e50;
}

.control-panel.collapsed .panel-toggle-btn {
  color: white;
}

/* Hamburger icon animation */
.hamburger-icon {
  display: inline-block;
  transition: transform 0.3s ease;
}

.control-panel:not(.collapsed) .hamburger-icon {
  transform: rotate(90deg);
}

/* ========================================
   RESPONSIVE ADJUSTMENTS
   ======================================== */

/* Adjust map when sidebars collapse */
.main-content {
  transition: grid-template-columns 0.3s ease;
}

.sidebar.collapsed ~ .main-content {
  grid-template-columns: 0 1fr;
}

/* Mobile: Auto-collapse on small screens */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    z-index: 1002;
    transform: translateX(-250px);
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
  
  .control-panel {
    width: 240px;
  }
}
```

---

### **Step 3: Add JavaScript Logic**

Add to your `dashboard.ts` or create a new `ui-controls.ts`:

```typescript
// dashboard.ts - Add to Dashboard class

class Dashboard {
  private leftSidebarCollapsed = false;
  private rightPanelCollapsed = false;

  // Add to init() method
  private init() {
    // ... existing initialization
    this.initCollapsibleSidebars();
    this.loadSidebarState();
  }

  private initCollapsibleSidebars() {
    // Left sidebar toggle
    const leftSidebar = document.getElementById('left-sidebar')!;
    const toggleLeftBtn = document.getElementById('toggle-left-sidebar')!;
    
    toggleLeftBtn.addEventListener('click', () => {
      this.leftSidebarCollapsed = !this.leftSidebarCollapsed;
      leftSidebar.classList.toggle('collapsed', this.leftSidebarCollapsed);
      this.saveSidebarState();
      
      // Update button icon
      const icon = toggleLeftBtn.querySelector('.icon')!;
      icon.textContent = this.leftSidebarCollapsed ? '▶' : '◀';
    });

    // Right panel toggle
    const rightPanel = document.getElementById('right-panel')!;
    const toggleRightBtn = document.getElementById('toggle-right-panel')!;
    
    toggleRightBtn.addEventListener('click', () => {
      this.rightPanelCollapsed = !this.rightPanelCollapsed;
      rightPanel.classList.toggle('collapsed', this.rightPanelCollapsed);
      this.saveSidebarState();
    });

    // Keyboard shortcuts (optional)
    document.addEventListener('keydown', (e) => {
      // Press '[' to toggle left sidebar
      if (e.key === '[') {
        toggleLeftBtn.click();
      }
      // Press ']' to toggle right panel
      if (e.key === ']') {
        toggleRightBtn.click();
      }
    });
  }

  private saveSidebarState() {
    localStorage.setItem('leftSidebarCollapsed', String(this.leftSidebarCollapsed));
    localStorage.setItem('rightPanelCollapsed', String(this.rightPanelCollapsed));
  }

  private loadSidebarState() {
    // Restore previous state
    const leftCollapsed = localStorage.getItem('leftSidebarCollapsed') === 'true';
    const rightCollapsed = localStorage.getItem('rightPanelCollapsed') === 'true';

    if (leftCollapsed) {
      document.getElementById('toggle-left-sidebar')!.click();
    }
    if (rightCollapsed) {
      document.getElementById('toggle-right-panel')!.click();
    }
  }
}
```

---

### **Step 4: Optional - Add Overlay for Mobile**

For mobile devices, add a backdrop overlay:

```html
<!-- Add to dashboard.html body -->
<div class="sidebar-backdrop" id="sidebar-backdrop"></div>
```

```css
.sidebar-backdrop {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
}

.sidebar.open ~ .sidebar-backdrop {
  display: block;
}
```

```typescript
// Add to initCollapsibleSidebars()
const backdrop = document.getElementById('sidebar-backdrop')!;
backdrop.addEventListener('click', () => {
  leftSidebar.classList.remove('open');
});
```

---

## 🎨 **ENHANCEMENT OPTIONS**

### **Option 1: Add Tooltips**

```typescript
toggleLeftBtn.setAttribute('title', 'Toggle Sidebar (Keyboard: [)');
toggleRightBtn.setAttribute('title', 'Toggle Panel (Keyboard: ])');
```

### **Option 2: Smooth Width Animation for Map**

```css
.main-content {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.collapsed ~ .main-content {
  margin-left: -250px;
}
```

### **Option 3: Add Icons (Using Unicode or Font)**

```html
<!-- Replace text icons with better symbols -->
<button class="sidebar-collapse-btn">
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
  </svg>
</button>
```

---

## ✅ **TESTING CHECKLIST**

1. **Left Sidebar:**
   - [ ] Click toggle button - sidebar slides out
   - [ ] Button icon rotates (◀ → ▶)
   - [ ] Map expands to fill space
   - [ ] State persists on page reload

2. **Right Panel:**
   - [ ] Click hamburger - panel collapses to button
   - [ ] Content hidden when collapsed
   - [ ] Click again - panel expands
   - [ ] State persists on page reload

3. **Responsive:**
   - [ ] On mobile, left sidebar auto-collapses
   - [ ] Backdrop appears on mobile when sidebar open
   - [ ] Touch interactions work smoothly

4. **Keyboard:**
   - [ ] Press `[` - toggles left sidebar
   - [ ] Press `]` - toggles right panel

---

## 🚀 **IMPLEMENTATION TIMELINE**

**Immediate (30 minutes):**
1. Add HTML structure (toggle buttons)
2. Add CSS styles
3. Add JavaScript toggle logic

**Polish (15 minutes):**
1. Add localStorage persistence
2. Test on different screen sizes
3. Add keyboard shortcuts

**Optional Enhancements (30 minutes):**
1. Add smooth animations
2. Add icons/tooltips
3. Add mobile backdrop overlay

---

## 📝 **DEVELOPMENT NOTES**

### **Why This Approach?**
- ✅ **No dependencies** - Pure CSS + vanilla JS
- ✅ **Lightweight** - Minimal code
- ✅ **Performant** - CSS transitions (GPU accelerated)
- ✅ **Accessible** - Keyboard support + tooltips

### **Alternative Libraries (if needed later):**
- **React Sidebar:** `react-pro-sidebar`
- **Vue Sidebar:** `vue-sidebar-menu`
- **Vanilla JS:** `offcanvas.js`

### **Accessibility Considerations:**
```html
<!-- Add ARIA attributes -->
<button 
  class="sidebar-collapse-btn"
  aria-label="Toggle navigation sidebar"
  aria-expanded="true"
>
  <span class="icon">◀</span>
</button>
```

---

## 🎯 **EXPECTED RESULT**

After implementation:
- Left sidebar slides smoothly like a drawer
- Right panel collapses to a floating hamburger button
- User preferences saved between sessions
- Clean, professional animations
- Mobile-friendly responsive behavior