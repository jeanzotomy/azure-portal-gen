# Project rules
- Store optional proposal tax rates inside each option's existing JSON payload and derive HT/tax/TTC totals rather than persisting computed amounts, preserving compatibility with older proposals.
- Catalogue features are selected from active service_catalog records and saved as proposal snapshots; selecting a feature never silently changes a budget or purchases a service.