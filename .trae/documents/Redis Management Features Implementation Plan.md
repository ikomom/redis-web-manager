# 1. Backend Updates (`server/src/index.ts`)
- Update `/api/set` endpoint to accept an optional `ttl` parameter.
- Implement TTL setting logic:
  - For `string` type: use `SET key value EX ttl`.
  - For `hash` type: execute `EXPIRE key ttl` after setting fields.

# 2. Store Updates (`client/src/store/useStore.ts`)
- Add `updateConnection(config: RedisConfig)` action to allow modifying existing connections (specifically for updating the `db` index).

# 3. Key List Enhancements (`client/src/components/KeyList.tsx`)
- **Multi-DB Support**: Add a dropdown selector (0-15) to switch databases for the current connection.
- **Tree View**: Implement a tree structure visualization for keys using `:` as a delimiter.
  - Parse flat key list into a nested object structure.
  - Create a recursive component to render the key tree with expand/collapse functionality.

# 4. Value Editor Improvements (`client/src/components/ValueEditor.tsx`)
- **Fix Key Name**: Ensure the key name input is correctly populated when a key is selected.
- **View Formats**: Add a "View As" dropdown with support for:
  - `Plain Text`: Default editable view.
  - `JSON`: Pretty-printed JSON (read-only/editable).
  - `HEX`: Hexadecimal representation (read-only).
  - `Base64`: Base64 encoded string (read-only).
- **TTL Support**: 
  - Convert the TTL display into an editable Input field.
  - Include the TTL value when saving the key.

# 5. API Client (`client/src/lib/api.ts`)
- Update `setValue` function to include the `ttl` parameter.
