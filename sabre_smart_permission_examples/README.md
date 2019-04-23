# Smart Permission Examples

Examples of smart permissions using the Sawtooth Sabre SDK.

[sabre documentation](https://sawtooth.hyperledger.org/docs/sabre/nightly/master/)

# Smart Permission Boilerplate

```
extern crate sabre_sdk;

use sabre_sdk::{WasmPtr, WasmPtrList, execute_smart_permission_entrypoint, WasmSdkError, Request};

fn has_permission(request: Request) -> Result<bool, WasmSdkError> {
    // Code describing permission
}

#[no_mangle]
pub unsafe fn entrypoint(roles: WasmPtrList, org_id: WasmPtr, public_key: WasmPtr) -> i32 {
    execute_smart_permission_entrypoint(roles, org_id, public_key, has_permission)
}
```
