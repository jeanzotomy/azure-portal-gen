

## Plan: Auto-select "projet" site in SharePoint browser

### Problem
The SharePoint browser currently shows all available sites, requiring manual selection. The user wants it to automatically load and display only the "projet" site.

### Approach
Modify `SharePointBrowser.tsx` to skip the site selection step entirely by automatically searching for and selecting the "projet" site on mount.

### Changes

**File: `src/components/SharePointBrowser.tsx`**
1. In the `useEffect` on mount, instead of calling `loadSites()` (which shows the site picker), directly search for the "projet" site using `callProxy("list-sites", { search: "projet" })`.
2. Auto-select the first matching site by calling `selectSite()` on it immediately.
3. Remove the sites list view (the `if (!selectedSite)` block that renders the site grid) and replace it with a loading/error state — since the user should never see the site picker.
4. If the "projet" site is not found, show an error message instead of the site list.

This means when the SharePoint tab opens, it will go directly to the drives list of the "projet" site, skipping the site selection entirely. The back button from drives will no longer go to site selection — it will simply stay at the drives level or be hidden.

### Technical details
- The `loadSites` function and `sites` state can be simplified since they're no longer used for display.
- The `searchQuery` input and site grid UI will be removed.
- The `goBack` function will be updated so going back from drives view does nothing (or stays on drives) instead of showing the site picker.

