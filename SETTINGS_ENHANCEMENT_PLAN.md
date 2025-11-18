# Settings Page Enhancement Plan

## 📋 Overview

This document outlines a comprehensive plan to add missing functionality to the Settings page (`src/components/SettingsView.tsx`). The enhancements will be implemented in phases, prioritizing critical user-facing features first.

---

## 🎯 Goals

1. **Complete Account Management** - Add sign out and account deletion
2. **Enhanced Data Management** - Add import, clear cache, and reset options
3. **User Information** - Add About/App info section
4. **Help & Support** - Add support links and resources
5. **Advanced Features** - Add developer options and accessibility settings

---

## 📦 Implementation Phases

### **Phase 1: Critical Account Management** (Priority: HIGH)
**Estimated Time: 2-3 hours**

#### Features to Add:
1. **Account Tab** (New tab)
   - Sign Out button
   - Delete Account button (with confirmation dialog)
   - Account information display (email, member since)

#### Implementation Details:
- **Location**: Add new "Account" tab to existing TabsList
- **Components Needed**:
  - Account management card component
  - Confirmation dialog for account deletion
- **Dependencies**:
  - `useAuth` hook (already exists)
  - `supabase` client (already imported)
  - `useToast` (already imported)
- **Files to Modify**:
  - `src/components/SettingsView.tsx`
- **New Files**:
  - `src/components/AccountSettings.tsx` (optional, for better organization)

#### Code Structure:
```typescript
// In SettingsView.tsx
<TabsList className="grid w-full grid-cols-6"> {/* Changed from 5 to 6 */}
  <TabsTrigger value="account">Account</TabsTrigger>
  {/* ... existing tabs ... */}
</TabsList>

<TabsContent value="account">
  <AccountSettings />
</TabsContent>
```

---

### **Phase 2: Enhanced Data Management** (Priority: HIGH)
**Estimated Time: 3-4 hours**

#### Features to Add:
1. **Data Import** - Import previously exported settings
2. **Clear Cache** - Clear application cache
3. **Reset Settings** - Reset all settings to defaults
4. **Delete All Data** - Delete all user data (with confirmation)

#### Implementation Details:
- **Location**: Enhance existing "Data" tab
- **Components Needed**:
  - File input for import
  - Confirmation dialogs for destructive actions
  - Progress indicators for data operations
- **Dependencies**:
  - `useAppStore` for cache management
  - File API for import
  - localStorage management
- **Files to Modify**:
  - `src/components/SettingsView.tsx`
- **New Functions**:
  - `importUserData()` - Parse and import JSON settings
  - `clearCache()` - Clear app cache using store
  - `resetSettings()` - Reset to default values
  - `deleteAllUserData()` - Delete all user data from database

#### Code Structure:
```typescript
// New functions in SettingsView.tsx
const importUserData = async (file: File) => {
  // Read file, parse JSON, validate, apply settings
};

const clearCache = () => {
  // Use useAppStore().clearCache()
  // Clear localStorage selectively
};

const resetSettings = () => {
  // Reset to default state
  // Show confirmation dialog
};

const deleteAllUserData = async () => {
  // Delete from database
  // Clear local storage
  // Sign out user
};
```

---

### **Phase 3: About & App Information** (Priority: MEDIUM)
**Estimated Time: 1-2 hours**

#### Features to Add:
1. **About Tab** (New tab)
   - App version display
   - Build information
   - Credits/Attributions
   - License information
   - Links to changelog

#### Implementation Details:
- **Location**: New "About" tab
- **Data Sources**:
  - `package.json` for version
  - Environment variables for build info
  - Static content for credits
- **Files to Modify**:
  - `src/components/SettingsView.tsx`
- **New Files**:
  - `src/components/AboutSettings.tsx` (optional)
  - `src/data/appInfo.ts` (for static content)

#### Code Structure:
```typescript
// In SettingsView.tsx
<TabsList className="grid w-full grid-cols-7"> {/* Changed from 6 to 7 */}
  {/* ... existing tabs ... */}
  <TabsTrigger value="about">About</TabsTrigger>
</TabsList>

<TabsContent value="about">
  <AboutSettings />
</TabsContent>
```

---

### **Phase 4: Help & Support** (Priority: MEDIUM)
**Estimated Time: 2-3 hours**

#### Features to Add:
1. **Help Tab** (New tab)
   - Contact Support button/link
   - FAQ link
   - Tutorials/Guides link
   - Report Bug button
   - Feature Request button
   - Documentation link

#### Implementation Details:
- **Location**: New "Help" tab
- **Components Needed**:
  - Support contact form (optional, can be link to email)
  - External links to documentation
- **Files to Modify**:
  - `src/components/SettingsView.tsx`
- **New Files**:
  - `src/components/HelpSettings.tsx` (optional)
  - `src/data/supportLinks.ts` (for support URLs)

#### Code Structure:
```typescript
// In SettingsView.tsx
<TabsList className="grid w-full grid-cols-8"> {/* Changed from 7 to 8 */}
  {/* ... existing tabs ... */}
  <TabsTrigger value="help">Help</TabsTrigger>
</TabsList>

<TabsContent value="help">
  <HelpSettings />
</TabsContent>
```

---

### **Phase 5: Advanced & Accessibility** (Priority: LOW)
**Estimated Time: 2-3 hours**

#### Features to Add:
1. **Advanced Tab** (New tab)
   - Developer mode toggle
   - Debug logging toggle
   - API endpoint display
   - Performance metrics
   - Accessibility settings:
     - Font size adjustment
     - High contrast mode
     - Reduced motion toggle

#### Implementation Details:
- **Location**: New "Advanced" tab
- **Components Needed**:
  - Toggle switches for developer options
   - Slider for font size
   - Performance metrics display
- **Dependencies**:
  - Context for accessibility preferences
  - Developer tools integration
- **Files to Modify**:
  - `src/components/SettingsView.tsx`
  - `src/contexts/AccessibilityContext.tsx` (new)
- **New Files**:
  - `src/components/AdvancedSettings.tsx`
  - `src/contexts/AccessibilityContext.tsx`

---

## 🏗️ Technical Architecture

### **Component Structure**

```
SettingsView.tsx (Main Container)
├── AccountSettings.tsx (Phase 1)
├── NotificationSettings.tsx (Existing)
├── AppearanceSettings.tsx (Existing - inline)
├── PrivacySettings.tsx (Existing - inline)
├── LocationSettings.tsx (Existing - inline)
├── DataSettings.tsx (Enhanced in Phase 2)
├── AboutSettings.tsx (Phase 3)
├── HelpSettings.tsx (Phase 4)
└── AdvancedSettings.tsx (Phase 5)
```

### **State Management**

1. **Local State** (useState):
   - Settings values
   - UI state (loading, dialogs)

2. **Context** (useContext):
   - `useAuth` - Authentication
   - `useTheme` - Theme (existing)
   - `useAppStore` - Global state (for cache)

3. **LocalStorage**:
   - Settings persistence (existing)
   - Cache management

### **Data Flow**

```
User Action
  ↓
SettingsView Handler
  ↓
Update Local State
  ↓
Save to LocalStorage
  ↓
Update Database (if needed)
  ↓
Show Toast Notification
```

---

## 🔧 Implementation Details

### **Phase 1: Account Management**

#### Step 1.1: Add Account Tab
- Modify `TabsList` to include "Account" tab
- Add `TabsContent` for account settings
- Import `useAuth` hook

#### Step 1.2: Implement Sign Out
```typescript
const handleSignOut = async () => {
  const confirmed = window.confirm('Are you sure you want to sign out?');
  if (confirmed) {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  }
};
```

#### Step 1.3: Implement Delete Account
```typescript
const handleDeleteAccount = async () => {
  const confirmed = window.confirm(
    'Are you sure you want to delete your account? This action cannot be undone.'
  );
  
  if (!confirmed) return;
  
  try {
    // Delete profile from database
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', user?.id);
    
    if (error) throw error;
    
    // Clear local storage
    localStorage.clear();
    
    // Sign out
    await signOut();
    
    toast({
      title: "Account deleted",
      description: "Your account has been deleted successfully.",
    });
  } catch (error) {
    toast({
      title: "Delete failed",
      description: "We could not delete your account. Please try again later.",
      variant: "destructive",
    });
  }
};
```

---

### **Phase 2: Enhanced Data Management**

#### Step 2.1: Data Import
```typescript
const importUserData = async (file: File) => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Validate structure
    if (!data.settings || !data.exportDate) {
      throw new Error('Invalid file format');
    }
    
    // Apply settings
    setLocalSettings(data.settings);
    saveLocalSettings(data.settings);
    
    toast({
      title: "Import successful",
      description: "Your settings have been imported.",
    });
  } catch (error) {
    toast({
      title: "Import failed",
      description: "Failed to import settings. Please check the file format.",
      variant: "destructive",
    });
  }
};
```

#### Step 2.2: Clear Cache
```typescript
const handleClearCache = () => {
  const confirmed = window.confirm(
    'This will clear all cached data. Continue?'
  );
  
  if (!confirmed) return;
  
  // Clear app store cache
  useAppStore.getState().clearCache();
  
  // Clear localStorage cache keys
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('cache-')) {
      localStorage.removeItem(key);
    }
  });
  
  toast({
    title: "Cache cleared",
    description: "All cached data has been cleared.",
  });
};
```

#### Step 2.3: Reset Settings
```typescript
const handleResetSettings = () => {
  const confirmed = window.confirm(
    'This will reset all settings to defaults. Continue?'
  );
  
  if (!confirmed) return;
  
  const defaultSettings = {
    theme: 'system',
    language: 'en',
    units: 'metric',
    dataRetention: '90days',
    privacy: {
      shareData: false,
      publicProfile: false,
      locationHistory: true
    },
    location: {
      autoLocation: true,
      locationAccuracy: 'high',
      locationHistory: true
    }
  };
  
  setLocalSettings(defaultSettings);
  saveLocalSettings(defaultSettings);
  
  toast({
    title: "Settings reset",
    description: "All settings have been reset to defaults.",
  });
};
```

---

### **Phase 3: About & App Information**

#### Step 3.1: Create App Info Data
```typescript
// src/data/appInfo.ts
export const appInfo = {
  name: "Breath Safe",
  version: "1.0.0", // From package.json
  buildDate: import.meta.env.BUILD_DATE || new Date().toISOString(),
  credits: [
    { name: "OpenWeatherMap", url: "https://openweathermap.org/" },
    { name: "AQICN", url: "https://aqicn.org/" },
    // ... more credits
  ],
  license: "MIT",
  changelogUrl: "/changelog",
};
```

#### Step 3.2: About Tab UI
- Display app name and version
- Show build information
- List credits with links
- Display license information
- Link to changelog

---

### **Phase 4: Help & Support**

#### Step 4.1: Support Links Data
```typescript
// src/data/supportLinks.ts
export const supportLinks = {
  email: "support@breathsafe.com",
  faq: "/faq",
  tutorials: "/tutorials",
  documentation: "/docs",
  bugReport: "https://github.com/breathsafe/issues",
  featureRequest: "https://github.com/breathsafe/issues",
};
```

#### Step 4.2: Help Tab UI
- Contact Support button (mailto link)
- FAQ link
- Tutorials link
- Documentation link
- Report Bug button
- Feature Request button

---

### **Phase 5: Advanced & Accessibility**

#### Step 5.1: Accessibility Context
```typescript
// src/contexts/AccessibilityContext.tsx
interface AccessibilityContextType {
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  reducedMotion: boolean;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
}
```

#### Step 5.2: Advanced Tab UI
- Developer mode toggle
- Debug logging toggle
- API endpoint display
- Performance metrics
- Font size slider
- High contrast toggle
- Reduced motion toggle

---

## 📁 File Structure

### **Files to Modify**
1. `src/components/SettingsView.tsx` - Main settings component
2. `src/components/NotificationSettings.tsx` - Already exists, no changes needed

### **New Files to Create**
1. `src/components/AccountSettings.tsx` - Account management (Phase 1)
2. `src/components/DataSettings.tsx` - Enhanced data management (Phase 2)
3. `src/components/AboutSettings.tsx` - About information (Phase 3)
4. `src/components/HelpSettings.tsx` - Help & support (Phase 4)
5. `src/components/AdvancedSettings.tsx` - Advanced options (Phase 5)
6. `src/data/appInfo.ts` - App information data (Phase 3)
7. `src/data/supportLinks.ts` - Support links data (Phase 4)
8. `src/contexts/AccessibilityContext.tsx` - Accessibility context (Phase 5)

### **Optional: Utility Files**
1. `src/utils/settingsImport.ts` - Settings import validation
2. `src/utils/settingsExport.ts` - Enhanced export functionality
3. `src/utils/cacheManager.ts` - Cache management utilities

---

## 🧪 Testing Strategy

### **Unit Tests**
- Test each setting update function
- Test data import/export
- Test cache clearing
- Test settings reset

### **Integration Tests**
- Test complete settings flow
- Test account deletion flow
- Test data import/export flow

### **Manual Testing Checklist**
- [ ] All tabs render correctly
- [ ] Settings persist after page refresh
- [ ] Sign out works correctly
- [ ] Account deletion works correctly
- [ ] Data import validates file format
- [ ] Data export creates valid JSON
- [ ] Cache clearing works
- [ ] Settings reset works
- [ ] All links open correctly
- [ ] Toast notifications appear
- [ ] Confirmation dialogs work
- [ ] Mobile responsive design

---

## 🎨 UI/UX Considerations

### **Design Consistency**
- Use existing `GlassCard` components
- Maintain consistent spacing and typography
- Follow existing color scheme
- Use existing icon library (lucide-react)

### **User Experience**
- Add confirmation dialogs for destructive actions
- Show loading states for async operations
- Provide clear success/error feedback
- Use appropriate button variants (destructive for delete actions)
- Group related settings logically

### **Accessibility**
- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility
- Focus management in dialogs

---

## 📊 Progress Tracking

### **Phase 1: Account Management**
- [ ] Add Account tab
- [ ] Implement sign out
- [ ] Implement delete account
- [ ] Add account information display
- [ ] Test account management flow

### **Phase 2: Enhanced Data Management**
- [ ] Add data import functionality
- [ ] Add clear cache functionality
- [ ] Add reset settings functionality
- [ ] Add delete all data functionality
- [ ] Test data management flow

### **Phase 3: About & App Information**
- [ ] Create app info data file
- [ ] Add About tab
- [ ] Display app version and info
- [ ] Add credits section
- [ ] Add license information

### **Phase 4: Help & Support**
- [ ] Create support links data file
- [ ] Add Help tab
- [ ] Add support contact options
- [ ] Add FAQ and documentation links
- [ ] Add bug report and feature request links

### **Phase 5: Advanced & Accessibility**
- [ ] Create accessibility context
- [ ] Add Advanced tab
- [ ] Implement developer options
- [ ] Implement accessibility settings
- [ ] Add performance metrics display

---

## 🚀 Deployment Considerations

### **Environment Variables**
- May need to add build date/time
- Support email configuration
- Documentation URLs

### **Database Changes**
- No database schema changes required
- Account deletion uses existing profile deletion

### **Breaking Changes**
- None expected
- All changes are additive

---

## 📝 Notes

1. **Tab Count**: Will increase from 5 to 8 tabs total
   - May need to adjust grid layout for mobile
   - Consider scrollable tabs on mobile

2. **Component Organization**: 
   - Can keep everything in SettingsView.tsx for simplicity
   - Or extract to separate components for better maintainability

3. **Error Handling**: 
   - All async operations should have try/catch
   - Show user-friendly error messages
   - Log errors for debugging

4. **Performance**:
   - Lazy load heavy components if needed
   - Optimize re-renders with useMemo/useCallback
   - Debounce settings updates if needed

---

## ✅ Success Criteria

1. All missing functionality is implemented
2. Settings persist correctly
3. All destructive actions have confirmations
4. UI is consistent with existing design
5. All features are tested and working
6. Code follows existing patterns and conventions
7. No breaking changes to existing functionality

---

## 🔄 Future Enhancements (Out of Scope)

- Two-factor authentication
- Active session management
- Password change functionality
- Email change functionality
- Cloud sync preferences
- Backup scheduling
- Advanced analytics settings

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-22  
**Author**: AI Assistant

