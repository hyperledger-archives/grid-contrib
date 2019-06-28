
# Grid Track and Trace Testing Procedure #

## Building Code and Docker Images ##

The steps in this section cover building and testing Grid Track and Trace code
and Docker images.

### Build Local Docker Images ###

First lets build the local Grid Docker Images used to run the compiled code
passed in as a volume.

```

$ cd ../grid
$ docker-compose -f docker-compose.yaml -f ../grid-contrib/track_and_trace/docker-compose.yaml build --force-rm
```

#### Verification Step ####

To verify that this step has been completed correctly, run the following
command:

```
$ docker images | grep grid
```

Checklist: Have the following Docker Images been created?

* tnt-asset-client
* grid_gridd
* tnt-contract-builder
* pike-contract-builder
* schema-contract-builder
* tnt-fish-client
* tnt-server
* tnt-shell
* hyperledger/sawtooth-shell

## Starting the Services ##

The steps in this section cover creating the Grid Track and Trace containers
and making sure that all of the services are communicating.

### Create and Start Containers ###

Now we will start the Grid containers, as well as the Track and Trace
containers.

From the Grid directory, run the following command:

```
$ docker-compose -f docker-compose.yaml -f ../grid-contrib/track_and_trace/docker-compose.yaml up
```

#### Verification Step ####

To verify that this step has been completed correctly, run the following
command:

```
$ docker ps
```

Checklist: Are the following Docker Containers running?

* hyperledger/sawtooth-devmode-engine-rust:1.1
* hyperledger/sawtooth-rest-api:1.1
* hyperledger/sawtooth-settings-tp:1.1
* hyperledger/sawtooth-validator:1.1
* grid-track-and-trace-tp
* grid_gridd
* postgres
* hyperledger/sawtooth-shell:1.1
* grid-pike-tp
* grid-schema-tp

Next, verify that the Pike, Grid Schema, and Grid Track and Trace smart
contracts have been committed to the blockchain. In the docker-compose logs,
you should find the following messages:

```
pike-contract-builder      | ---------========= pike contract is loaded =========---------
schema-contract-builder    | ---------========= grid schema contract is loaded =========---------
tnt-contract-builder       | ---------========= track and trace contract is loaded =========---------
```

## Verify Communication and Functionality ##

The steps in this section cover testing Grid Track and Trace using the
AssetTrack demo application.

### AssetTrack Test ###

Finally, we will go through the AssetTrack demo application to ensure that the
app is functioning properly and communicating with the Grid services.

Complete the following actions:

1. Navigate to `localhost:8021` in a web browser.
2. Click the Get Started button.
3. Fill and submit this form to create a new user in the Track and Trace
database, and send transaction to Grid that will create a Pike agent and
organization.
4. Navigate to the View Agents page.
    * You should see the user you just created in the list.
5. Navigate to the Profile page.
    * You should see a public key and organization ID.
6. Navigate to the Add Asset page, and fill out and submit the form.
7. Navigate to the View Assets page.
    * You should see the newly created asset in the list.
8. Log out and create a new user/organization using the Get Started form.
9. Log in as the first agent.
10. Go to the View Assets page and select the asset that was created.
11. Transfer custodianship to the second agent, and authorize them as a reporter
on one of the properties.
12. Log out and log back in as the second agent.
13. Navigate to the asset.
    * You should see two pending proposals: one for custodianship and one for
    reporter authorization.
14. Accept the proposals.
15. Update the property that the second agent is authorized to submit updates
for.
    * You should see that the update transaction has been sent and applied.

If all of the actions were successfully completed, Grid Track and Trace should
be functioning properly.
