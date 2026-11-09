# Session checklist

A right-sidebar tab with a checklist for the current session. Points can be
added, checked off, and reopened. The state is stored in `localStorage` under a
key that includes the session id, so each conversation keeps its own checklist
across reloads.

The tab type registers through `ctx.sidebarRightTabs` and its body and chip title
through the `sidebar.right.pane.tab` and `sidebar.right.pane.tab.title` seats. A
guide entry offers the page for manual opening, and the plugin opens the tab for
the on-screen session once when it is not already open. On unload, it closes only
tabs of its own kind.
