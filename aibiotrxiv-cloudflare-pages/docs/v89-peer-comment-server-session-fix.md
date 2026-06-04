# v89 peer comment server session fix

- Peer comment posting now checks the real Cloudflare/D1 member session before showing the comment form.
- The article page no longer decides peer-comment eligibility from readable OAuth cookies alone.
- `/api/member/session` now returns comment restriction fields so the article page and comment API use the same account state.
- The member frontend refreshes the server session on page load and exposes `AIBIO.memberServerSession()` for public article pages.
