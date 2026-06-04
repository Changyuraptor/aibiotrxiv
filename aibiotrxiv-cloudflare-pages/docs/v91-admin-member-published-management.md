# v91 Admin member and published management fixes

- Member management now reads real member accounts from the D1 `members` table through `/api/admin/members`, instead of relying on the legacy `aibio_members` app key-value record.
- Admin account suspension, account restoration, comment restriction, and comment restoration now write back to the D1 `members` table.
- Published manuscript management now includes a search box at the upper-right of the page.
- Published manuscript management shows 100 records per page and renders pagination controls at the bottom when more records exist.
- Published search matches title, article ID, version, author, topic, email, and published date.
