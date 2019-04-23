// Copyright 2018 Cargill Incorporated
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

extern crate sabre_sdk;
extern crate grid_sdk;

use sabre_sdk::{WasmPtr, WasmPtrList, execute_smart_permission_entrypoint, WasmSdkError, Request};
use grid_sdk::protos::pike_state::AgentList;
use grid_sdk::protos::track_and_trace_payload::CreateProposalAction;

/// Agents have a single white listed agent they can send
/// proposals to.
///
fn has_permission(request: Request) -> Result<bool, WasmSdkError> {
    let proposal = protobuf::parse_from_bytes::<CreateProposalAction>(&request.get_payload::<Vec<u8>>())?;
    let receiving_agent = proposal.get_receiving_agent();

    let agent_bytes = request.get_state(request.get_org_id())?.unwrap();

    let agents = protobuf::parse_from_bytes::<AgentList>(&agent_bytes)?;

    let agent = agents
        .get_agents()
        .to_vec()
        .into_iter()
        .find(|agent| agent.get_public_key() == request.get_public_key());

    if let Some(a) = agent {
        Ok(a.get_metadata()
           .to_vec()
           .iter()
           .any(|x| x.get_key() == "white_list_agent" && x.get_value() == receiving_agent))
    } else {
        Ok(false)
    }
}

#[no_mangle]
pub unsafe fn entrypoint(roles: WasmPtrList, org_id: WasmPtr, public_key: WasmPtr, payload: WasmPtr) -> i32 {
    execute_smart_permission_entrypoint(roles, org_id, public_key, payload, has_permission)
}
