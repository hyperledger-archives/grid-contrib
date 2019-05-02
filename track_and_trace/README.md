# Track and Trace

The Grid Track and Trace transaction family allows users to track goods as they
move through a supply chain. Records for goods include a history of ownership
and custodianship, as well as histories for a variety of properties such as
temperature and location. These properties are managed through a 
user-specifiable system of record types. This README outlines how to start the
example Track and Trace applications AssetTrack and FishNet locally using
Docker.

### Prerequisites

Running Track and Trace requires [docker](https://www.docker.com/get-started) to
be installed locally on your machine.

### Getting Started

1) Clone the [grid](https://github.com/hyperledger/grid) and
[grid-contrib](https://github.com/hyperledger/grid-contrib) repositories from github.
    ```
    $ git clone https://github.com/hyperledger/grid.git
    $ git clone https://github.com/hyperledger/grid-contrib.git
    ```
2) Navigate to the grid directory and run docker-compose.
    ```
    $ cd grid
    $ docker-compose -f docker-compose.yaml -f ../grid-contrib/track_and_trace/docker-compose.yaml up --build
    ```
    Building the projects in docker will take several minutes the first time the command is run.
    
3) Once the projects have built and the servers are running, you will be able to use the Track 
    and Trace clients via a web browser.

    * AssetTrack: http://localhost:8021
    * FishNet: http://localhost:8022
