

## Plan: Auto-navigate to Documents drive on mount

**Goal**: When clicking the "Fichiers" tab, skip the drives selection screen and go directly into the "Documents" library of the "Projet" site.

### Changes

**File: `src/components/SharePointBrowser.tsx`**

Modify the `useEffect` that runs on mount to also auto-select the "Documents" drive:

1. After loading drives, find the drive named "Documents" (or "Documents" / "Shared Documents" — match case-insensitively containing "document").
2. If found, auto-select it and immediately load its root files.
3. If not found, fall back to the current drives list view.

This means the component will go from loading → directly showing the file browser inside `Projet > Documents`, skipping the intermediate drives selection screen entirely.

### Technical detail

In the existing `useEffect` (around line 81), after `setDrives(drivesData.value || [])`, add:

```typescript
const docsDrive = (drivesData.value || []).find(
  (d: Drive) => d.name.toLowerCase().includes("document")
);
if (docsDrive) {
  setSelectedDrive(docsDrive);
  const filesData = await callProxy("list-files", { siteId: site.id, driveId: docsDrive.id });
  if (!active) return;
  setItems(filesData.value || []);
}
```

Single file change, no database migration needed.

