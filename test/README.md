# Tests

`ui-smoke.js` is a jsdom integration smoke test: it logs in, loads the real
pages against a running server, executes the client JS, and drives the UI
(tabs, findings add/approve, network map, ATT&CK helper, chat) asserting there
are no runtime errors and that role permissions are enforced in the UI.

```bash
# 1) start the app in one terminal:  node server.js
# 2) then:
npm i jsdom
node test/ui-smoke.js
```
