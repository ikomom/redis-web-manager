# 1. Frontend: Install Monaco Editor
- Install `@monaco-editor/react` in `client` directory.

# 2. Frontend: Enhance `ValueEditor.tsx`
- **Refresh Single Key**: Add a "Refresh" button in the header (next to Save/Delete) that calls `loadValue` for the current key.
- **Professional Preview**:
  - Replace `Textarea` with `MonacoEditor`.
  - Configure Monaco languages dynamically based on `viewMode`:
    - `json` -> `json` language (with formatting).
    - `text`, `hex`, `base64` -> `plaintext` language.
  - Set `readOnly` prop on Monaco based on `viewMode` (only `text` and `json` are editable, `hex`/`base64` are read-only).
  - Add specific support for `ReJSON` (RedisJSON) types in the Type dropdown.

# 3. Backend: Support RedisJSON (`server/src/index.ts`)
- **Type Detection**:
  - Update `/api/keys`: `ioredis` pipeline `type` command should already return `ReJSON` (or `json` depending on module version). We'll handle both.
- **Get Value**:
  - Update `/api/value`: Add case for `ReJSON` type. Use `client.call('JSON.GET', key)` to fetch JSON data.
- **Set Value**:
  - Update `/api/set`: Add case for `ReJSON` type. Use `client.call('JSON.SET', key, '$', value)` to save.

# 4. Frontend: Add JSON Type Support
- **KeyList**: Ensure `ReJSON` type is displayed correctly (maybe mapped to "JSON").
- **ValueEditor**: Add `JSON` option to the Type select dropdown.
